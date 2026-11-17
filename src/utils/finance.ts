import type {
  CategoryBreakdownItem,
  EntryKind,
  FinanceEntry,
  LedgerStore,
  MonthLedger,
  MonthlySummary,
  MonthlyTrendPoint,
} from '../types/finance';

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatCompactBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  const sign = safe < 0 ? '-' : '';
  if (abs >= 1000) {
    const thousands = (abs / 1000).toFixed(1).replace('.', ',');
    return `${sign}R$ ${thousands}k`;
  }
  return formatBRL(safe);
}

export function parseCurrencyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Remove R$, spaces, and handle Brazilian "1.250,50" or dot-decimal "1250.50"
  let cleaned = trimmed.replace(/[R$\s]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Assume Brazilian format: dots are thousands, comma is decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  } else if (hasDot) {
    // Single dot with 3 trailing digits could be thousands separator like "1.200"
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      cleaned = parts.join('');
    }
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (!Number.isInteger(year) || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${MONTH_NAMES_PT[monthIdx]} ${year}`;
}

export function formatMonthShort(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIdx = Number(monthStr) - 1;
  if (!yearStr || monthIdx < 0 || monthIdx > 11) {
    return monthKey;
  }
  return `${MONTH_SHORT_PT[monthIdx]}/${yearStr.slice(2)}`;
}

export function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + deltaMonths, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function calculateMonthlySummary(ledger: MonthLedger): MonthlySummary {
  let totalIncome = 0;
  let totalFixed = 0;
  let totalVariable = 0;
  let paidExpenses = 0;
  let pendingExpenses = 0;

  for (const entry of ledger.entries) {
    const amount = Number.isFinite(entry.amount) ? Math.max(0, entry.amount) : 0;
    if (entry.kind === 'income') {
      totalIncome += amount;
    } else if (entry.kind === 'fixed') {
      totalFixed += amount;
      if (entry.status === 'paid') paidExpenses += amount;
      else pendingExpenses += amount;
    } else {
      totalVariable += amount;
      if (entry.status === 'paid') paidExpenses += amount;
      else pendingExpenses += amount;
    }
  }

  totalIncome = roundCurrency(totalIncome);
  totalFixed = roundCurrency(totalFixed);
  totalVariable = roundCurrency(totalVariable);
  const totalExpenses = roundCurrency(totalFixed + totalVariable);
  const finalBalance = roundCurrency(totalIncome - totalExpenses);
  paidExpenses = roundCurrency(paidExpenses);
  pendingExpenses = roundCurrency(pendingExpenses);

  const savingsRate =
    totalIncome > 0 ? Math.round(((finalBalance / totalIncome) * 100) * 10) / 10 : 0;
  const expenseToIncomeRatio =
    totalIncome > 0 ? Math.round(((totalExpenses / totalIncome) * 100) * 10) / 10 : 0;

  const expenseEntries = ledger.entries.filter((e) => e.kind !== 'income');
  const breakdown: CategoryBreakdownItem[] = expenseEntries
    .map((e) => ({
      id: e.id,
      description: e.description,
      category: e.category,
      kind: e.kind as 'fixed' | 'variable',
      amount: roundCurrency(e.amount),
      shareOfExpenses:
        totalExpenses > 0
          ? Math.round(((e.amount / totalExpenses) * 100) * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    monthKey: ledger.monthKey,
    totalIncome,
    totalFixed,
    totalVariable,
    totalExpenses,
    finalBalance,
    paidExpenses,
    pendingExpenses,
    savingsRate,
    expenseToIncomeRatio,
    breakdown,
  };
}

export function buildMonthlyTrend(
  store: LedgerStore,
  activeMonthKey: string,
  monthsCount = 4
): MonthlyTrendPoint[] {
  const keys: string[] = [];
  for (let offset = -(monthsCount - 1); offset <= 0; offset += 1) {
    keys.push(shiftMonthKey(activeMonthKey, offset));
  }

  return keys.map((key) => {
    const ledger = store[key] ?? createBlankMonthLedger(key);
    const summary = calculateMonthlySummary(ledger);
    return {
      monthKey: key,
      shortLabel: formatMonthShort(key),
      fullLabel: formatMonthLabel(key),
      totalIncome: summary.totalIncome,
      totalFixed: summary.totalFixed,
      totalVariable: summary.totalVariable,
      totalExpenses: summary.totalExpenses,
      finalBalance: summary.finalBalance,
    };
  });
}

export function createBlankMonthLedger(monthKey: string): MonthLedger {
  return {
    monthKey,
    entries: [
      {
        id: `${monthKey}-inc-1`,
        description: 'Salário Mensal',
        category: 'Trabalho Principal',
        kind: 'income',
        amount: 0,
        day: 5,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-fix-energia`,
        description: 'Energia Elétrica',
        category: 'Moradia',
        kind: 'fixed',
        amount: 0,
        day: 10,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-fix-internet`,
        description: 'Internet',
        category: 'Conectividade',
        kind: 'fixed',
        amount: 0,
        day: 12,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-fix-agua`,
        description: 'Água',
        category: 'Moradia',
        kind: 'fixed',
        amount: 0,
        day: 15,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-fix-celular`,
        description: 'Plano do Celular',
        category: 'Conectividade',
        kind: 'fixed',
        amount: 0,
        day: 18,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-fix-moto`,
        description: 'Financiamento da Moto',
        category: 'Transporte',
        kind: 'fixed',
        amount: 0,
        day: 20,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-var-combustivel`,
        description: 'Combustível',
        category: 'Transporte',
        kind: 'variable',
        amount: 0,
        day: 15,
        status: 'pending',
        isCore: true,
      },
      {
        id: `${monthKey}-var-mercado`,
        description: 'Mercado',
        category: 'Alimentação',
        kind: 'variable',
        amount: 0,
        day: 15,
        status: 'pending',
        isCore: true,
      },
    ],
  };
}

export function cloneRecurringFromMonth(
  source: MonthLedger,
  targetMonthKey: string
): MonthLedger {
  const entries: FinanceEntry[] = source.entries.map((item, idx) => ({
    ...item,
    id: `${targetMonthKey}-cloned-${idx}-${Date.now()}`,
    // Keep fixed & income amounts as baseline; reset variable expenses to current values or keep template
    amount: item.kind === 'variable' ? 0 : item.amount,
    status: 'pending',
  }));
  return {
    monthKey: targetMonthKey,
    entries,
  };
}

export function createSeedStore(currentMonthKey = '2026-11'): LedgerStore {
  const prev3 = shiftMonthKey(currentMonthKey, -3); // 2026-08
  const prev2 = shiftMonthKey(currentMonthKey, -2); // 2026-09
  const prev1 = shiftMonthKey(currentMonthKey, -1); // 2026-10

  return {
    [prev3]: {
      monthKey: prev3,
      entries: [
        { id: `${prev3}-inc-1`, description: 'Salário Mensal', category: 'Trabalho Principal', kind: 'income', amount: 3800, day: 5, status: 'paid', isCore: true },
        { id: `${prev3}-inc-2`, description: 'Serviços Extras', category: 'Renda Extra', kind: 'income', amount: 250, day: 18, status: 'paid' },
        { id: `${prev3}-fix-energia`, description: 'Energia Elétrica', category: 'Moradia', kind: 'fixed', amount: 169.8, day: 10, status: 'paid', isCore: true },
        { id: `${prev3}-fix-internet`, description: 'Internet', category: 'Conectividade', kind: 'fixed', amount: 119.9, day: 12, status: 'paid', isCore: true },
        { id: `${prev3}-fix-agua`, description: 'Água', category: 'Moradia', kind: 'fixed', amount: 71.2, day: 15, status: 'paid', isCore: true },
        { id: `${prev3}-fix-celular`, description: 'Plano do Celular', category: 'Conectividade', kind: 'fixed', amount: 59.9, day: 18, status: 'paid', isCore: true },
        { id: `${prev3}-fix-moto`, description: 'Financiamento da Moto', category: 'Transporte', kind: 'fixed', amount: 685, day: 20, status: 'paid', isCore: true },
        { id: `${prev3}-var-combustivel`, description: 'Combustível', category: 'Transporte', kind: 'variable', amount: 245, day: 14, status: 'paid', isCore: true },
        { id: `${prev3}-var-mercado`, description: 'Mercado', category: 'Alimentação', kind: 'variable', amount: 840.6, day: 21, status: 'paid', isCore: true },
      ],
    },
    [prev2]: {
      monthKey: prev2,
      entries: [
        { id: `${prev2}-inc-1`, description: 'Salário Mensal', category: 'Trabalho Principal', kind: 'income', amount: 3800, day: 5, status: 'paid', isCore: true },
        { id: `${prev2}-inc-2`, description: 'Serviços Extras', category: 'Renda Extra', kind: 'income', amount: 450, day: 19, status: 'paid' },
        { id: `${prev2}-fix-energia`, description: 'Energia Elétrica', category: 'Moradia', kind: 'fixed', amount: 178.4, day: 10, status: 'paid', isCore: true },
        { id: `${prev2}-fix-internet`, description: 'Internet', category: 'Conectividade', kind: 'fixed', amount: 119.9, day: 12, status: 'paid', isCore: true },
        { id: `${prev2}-fix-agua`, description: 'Água', category: 'Moradia', kind: 'fixed', amount: 74.5, day: 15, status: 'paid', isCore: true },
        { id: `${prev2}-fix-celular`, description: 'Plano do Celular', category: 'Conectividade', kind: 'fixed', amount: 59.9, day: 18, status: 'paid', isCore: true },
        { id: `${prev2}-fix-moto`, description: 'Financiamento da Moto', category: 'Transporte', kind: 'fixed', amount: 685, day: 20, status: 'paid', isCore: true },
        { id: `${prev2}-var-combustivel`, description: 'Combustível', category: 'Transporte', kind: 'variable', amount: 260, day: 14, status: 'paid', isCore: true },
        { id: `${prev2}-var-mercado`, description: 'Mercado', category: 'Alimentação', kind: 'variable', amount: 890.2, day: 22, status: 'paid', isCore: true },
      ],
    },
    [prev1]: {
      monthKey: prev1,
      entries: [
        { id: `${prev1}-inc-1`, description: 'Salário Mensal', category: 'Trabalho Principal', kind: 'income', amount: 3800, day: 5, status: 'paid', isCore: true },
        { id: `${prev1}-inc-2`, description: 'Serviços Extras', category: 'Renda Extra', kind: 'income', amount: 300, day: 21, status: 'paid' },
        { id: `${prev1}-fix-energia`, description: 'Energia Elétrica', category: 'Moradia', kind: 'fixed', amount: 192.1, day: 10, status: 'paid', isCore: true },
        { id: `${prev1}-fix-internet`, description: 'Internet', category: 'Conectividade', kind: 'fixed', amount: 119.9, day: 12, status: 'paid', isCore: true },
        { id: `${prev1}-fix-agua`, description: 'Água', category: 'Moradia', kind: 'fixed', amount: 78.2, day: 15, status: 'paid', isCore: true },
        { id: `${prev1}-fix-celular`, description: 'Plano do Celular', category: 'Conectividade', kind: 'fixed', amount: 59.9, day: 18, status: 'paid', isCore: true },
        { id: `${prev1}-fix-moto`, description: 'Financiamento da Moto', category: 'Transporte', kind: 'fixed', amount: 685, day: 20, status: 'paid', isCore: true },
        { id: `${prev1}-var-combustivel`, description: 'Combustível', category: 'Transporte', kind: 'variable', amount: 295.5, day: 16, status: 'paid', isCore: true },
        { id: `${prev1}-var-mercado`, description: 'Mercado', category: 'Alimentação', kind: 'variable', amount: 945.8, day: 25, status: 'paid', isCore: true },
      ],
    },
    [currentMonthKey]: {
      monthKey: currentMonthKey,
      entries: [
        { id: `${currentMonthKey}-inc-1`, description: 'Salário Mensal', category: 'Trabalho Principal', kind: 'income', amount: 3800, day: 5, status: 'paid', isCore: true },
        { id: `${currentMonthKey}-inc-2`, description: 'Renda Extra', category: 'Renda Extra', kind: 'income', amount: 650, day: 15, status: 'paid' },
        { id: `${currentMonthKey}-fix-energia`, description: 'Energia Elétrica', category: 'Moradia', kind: 'fixed', amount: 184.6, day: 10, status: 'paid', isCore: true },
        { id: `${currentMonthKey}-fix-internet`, description: 'Internet', category: 'Conectividade', kind: 'fixed', amount: 119.9, day: 12, status: 'paid', isCore: true },
        { id: `${currentMonthKey}-fix-agua`, description: 'Água', category: 'Moradia', kind: 'fixed', amount: 76.4, day: 15, status: 'paid', isCore: true },
        { id: `${currentMonthKey}-fix-celular`, description: 'Plano do Celular', category: 'Conectividade', kind: 'fixed', amount: 59.9, day: 18, status: 'pending', isCore: true },
        { id: `${currentMonthKey}-fix-moto`, description: 'Financiamento da Moto', category: 'Transporte', kind: 'fixed', amount: 685, day: 20, status: 'pending', isCore: true },
        { id: `${currentMonthKey}-var-combustivel`, description: 'Combustível', category: 'Transporte', kind: 'variable', amount: 240, day: 11, status: 'paid', isCore: true },
        { id: `${currentMonthKey}-var-mercado`, description: 'Mercado', category: 'Alimentação', kind: 'variable', amount: 865.4, day: 14, status: 'paid', isCore: true },
      ],
    },
  };
}

export function generateMonthCSV(ledger: MonthLedger): string {
  const summary = calculateMonthlySummary(ledger);
  const kindLabel: Record<EntryKind, string> = {
    income: 'Rendimento',
    fixed: 'Despesa Fixa',
    variable: 'Gasto Variável',
  };

  const escapeCsv = (val: string) => {
    if (val.includes(';') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const header = ['Grupo', 'Descrição', 'Categoria', 'Dia', 'Status', 'Valor (R$)'].join(';');
  const rows = ledger.entries.map((entry) => {
    const statusText =
      entry.kind === 'income'
        ? entry.status === 'paid'
          ? 'Recebido'
          : 'A receber'
        : entry.status === 'paid'
          ? 'Pago'
          : 'Pendente';
    const amountStr = entry.amount.toFixed(2).replace('.', ',');
    return [
      kindLabel[entry.kind],
      escapeCsv(entry.description),
      escapeCsv(entry.category),
      String(entry.day),
      statusText,
      amountStr,
    ].join(';');
  });

  const footer = [
    '',
    `Resumo;${formatMonthLabel(ledger.monthKey)};;;;`,
    `Total de Rendimentos;;;;;${summary.totalIncome.toFixed(2).replace('.', ',')}`,
    `Total Despesas Fixas;;;;;${summary.totalFixed.toFixed(2).replace('.', ',')}`,
    `Total Gastos Variáveis;;;;;${summary.totalVariable.toFixed(2).replace('.', ',')}`,
    `Total de Despesas;;;;;${summary.totalExpenses.toFixed(2).replace('.', ',')}`,
    `Saldo Final do Mês;;;;;${summary.finalBalance.toFixed(2).replace('.', ',')}`,
  ];

  return [header, ...rows, ...footer].join('\n');
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
