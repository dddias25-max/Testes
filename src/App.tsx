import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  RotateCcw,
  Search,
} from 'lucide-react';
import { ComparativeChart } from './components/ComparativeChart';
import { EntryModal } from './components/EntryModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SpreadsheetSection } from './components/SpreadsheetSection';
import { SummaryStrip } from './components/SummaryStrip';
import { TopBar } from './components/TopBar';
import type { EntryStatus, FinanceEntry, LedgerStore } from './types/finance';
import {
  buildMonthlyTrend,
  calculateMonthlySummary,
  cloneRecurringFromMonth,
  createBlankMonthLedger,
  formatBRL,
  formatMonthLabel,
  generateMonthCSV,
  shiftMonthKey,
} from './utils/finance';
import {
  DEFAULT_ACTIVE_MONTH,
  loadLedgerStore,
  resetLedgerStore,
  saveLedgerStore,
} from './utils/storage';

type StatusFilter = 'all' | EntryStatus;

export default function App() {
  const [store, setStore] = useState<LedgerStore>(() => loadLedgerStore());
  const [activeMonthKey, setActiveMonthKey] = useState<string>(DEFAULT_ACTIVE_MONTH);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    saveLedgerStore(store);
  }, [store]);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => setFeedbackMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const currentLedger = useMemo(() => {
    return store[activeMonthKey] ?? createBlankMonthLedger(activeMonthKey);
  }, [store, activeMonthKey]);

  const summary = useMemo(() => calculateMonthlySummary(currentLedger), [currentLedger]);

  const trend = useMemo(
    () => buildMonthlyTrend(store, activeMonthKey, 4),
    [store, activeMonthKey]
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return currentLedger.entries.filter((entry) => {
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesQuery =
        !query ||
        entry.description.toLowerCase().includes(query) ||
        entry.category.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [currentLedger.entries, searchQuery, statusFilter]);

  const incomeEntries = useMemo(
    () => filteredEntries.filter((e) => e.kind === 'income'),
    [filteredEntries]
  );
  const fixedEntries = useMemo(
    () => filteredEntries.filter((e) => e.kind === 'fixed'),
    [filteredEntries]
  );
  const variableEntries = useMemo(
    () => filteredEntries.filter((e) => e.kind === 'variable'),
    [filteredEntries]
  );

  const updateCurrentLedgerEntries = (
    updater: (entries: FinanceEntry[]) => FinanceEntry[]
  ) => {
    setStore((prev) => {
      const existing = prev[activeMonthKey] ?? createBlankMonthLedger(activeMonthKey);
      return {
        ...prev,
        [activeMonthKey]: {
          monthKey: activeMonthKey,
          entries: updater(existing.entries),
        },
      };
    });
  };

  const handleUpdateEntry = (id: string, patch: Partial<FinanceEntry>) => {
    updateCurrentLedgerEntries((entries) =>
      entries.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleAddEntry = (newEntry: Omit<FinanceEntry, 'id'>) => {
    const id = `${activeMonthKey}-${newEntry.kind}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    updateCurrentLedgerEntries((entries) => [...entries, { ...newEntry, id }]);
    setFeedbackMessage(`"${newEntry.description}" adicionado à planilha.`);
  };

  const handleDeleteEntry = (id: string) => {
    const target = currentLedger.entries.find((e) => e.id === id);
    updateCurrentLedgerEntries((entries) => entries.filter((item) => item.id !== id));
    if (target) {
      setFeedbackMessage(`"${target.description}" removido.`);
    }
  };

  const handleSelectMonth = (nextMonthKey: string) => {
    setActiveMonthKey(nextMonthKey);
    setStore((prev) => {
      if (prev[nextMonthKey]) return prev;
      return {
        ...prev,
        [nextMonthKey]: createBlankMonthLedger(nextMonthKey),
      };
    });
  };

  const handleCopyFromPreviousMonth = () => {
    const prevKey = shiftMonthKey(activeMonthKey, -1);
    const prevLedger = store[prevKey];
    if (!prevLedger) {
      setFeedbackMessage(`Não há dados salvos em ${formatMonthLabel(prevKey)} para copiar.`);
      return;
    }
    const cloned = cloneRecurringFromMonth(prevLedger, activeMonthKey);
    setStore((prev) => ({
      ...prev,
      [activeMonthKey]: cloned,
    }));
    setFeedbackMessage(
      `Rendimentos e despesas fixas copiados de ${formatMonthLabel(prevKey)}.`
    );
  };

  const handleExportCSV = () => {
    const csvContent = generateMonthCSV(currentLedger);
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `controle-financeiro-${activeMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMessage(`Planilha de ${formatMonthLabel(activeMonthKey)} exportada em CSV.`);
  };

  const handleResetDemo = () => {
    const seed = resetLedgerStore();
    setStore(seed);
    setActiveMonthKey(DEFAULT_ACTIVE_MONTH);
    setSearchQuery('');
    setStatusFilter('all');
    setFeedbackMessage('Dados iniciais restaurados.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar onOpenNewEntry={() => setIsModalOpen(true)} />

      <main className="mx-auto max-w-[1320px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Heading & Month/Filter Toolbar */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl text-balance">
                Controle Financeiro Mensal
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Clique em qualquer valor, dia ou descrição na planilha para editar em tempo real.
              </p>
            </div>

            {/* Month Switcher & Actions */}
            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap xl:shrink-0">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => handleSelectMonth(shiftMonthKey(activeMonthKey, -1))}
                  aria-label="Mês anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span
                  data-testid="active-month-label"
                  className="min-w-[140px] px-2.5 text-center text-sm font-semibold text-slate-900 whitespace-nowrap"
                >
                  {formatMonthLabel(activeMonthKey)}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectMonth(shiftMonthKey(activeMonthKey, 1))}
                  aria-label="Próximo mês"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyFromPreviousMonth}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copiar mês anterior</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Restaurar exemplo</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filter Strip */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lançamento (ex.: energia, moto, mercado)..."
                aria-label="Buscar lançamentos na planilha"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Filtrar por status"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                {(
                  [
                    { value: 'all', label: 'Todos' },
                    { value: 'paid', label: 'Pagos / Recebidos' },
                    { value: 'pending', label: 'Pendentes' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.value
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <PWAInstallButton />
            </div>
          </div>

          {feedbackMessage && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-medium text-teal-900"
            >
              {feedbackMessage}
            </div>
          )}
        </div>

        {/* 4-Column Summary KPIs */}
        <SummaryStrip summary={summary} />

        {/* Comparative Chart */}
        <ComparativeChart
          summary={summary}
          trend={trend}
          activeMonthKey={activeMonthKey}
          onSelectMonth={handleSelectMonth}
        />

        {/* Spreadsheet Sections */}
        <div className="space-y-6">
          <SpreadsheetSection
            id="rendimentos"
            title="Rendimentos"
            subtitle="Salário, renda extra e demais entradas do mês"
            kind="income"
            entries={incomeEntries}
            subtotal={summary.totalIncome}
            categorySuggestions={[
              'Trabalho Principal',
              'Renda Extra',
              'Freelance',
              'Outros Rendimentos',
            ]}
            onUpdateEntry={handleUpdateEntry}
            onAddEntry={handleAddEntry}
            onDeleteEntry={handleDeleteEntry}
          />

          <SpreadsheetSection
            id="despesas-fixas"
            title="Despesas Fixas"
            subtitle="Energia elétrica, internet, água, plano do celular e financiamento da moto"
            kind="fixed"
            entries={fixedEntries}
            subtotal={summary.totalFixed}
            categorySuggestions={[
              'Moradia',
              'Conectividade',
              'Transporte',
              'Educação / Saúde',
              'Outros Fixos',
            ]}
            onUpdateEntry={handleUpdateEntry}
            onAddEntry={handleAddEntry}
            onDeleteEntry={handleDeleteEntry}
          />

          <SpreadsheetSection
            id="gastos-variaveis"
            title="Gastos Variáveis"
            subtitle="Combustível, mercado e despesas variáveis do mês"
            kind="variable"
            entries={variableEntries}
            subtotal={summary.totalVariable}
            categorySuggestions={[
              'Transporte',
              'Alimentação',
              'Lazer',
              'Compras',
              'Outros Variáveis',
            ]}
            onUpdateEntry={handleUpdateEntry}
            onAddEntry={handleAddEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        </div>

        {/* Clean Monthly Closing Ledger Summary */}
        <footer className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
              <span className="font-semibold text-slate-900">
                Fechamento de {formatMonthLabel(activeMonthKey)}
              </span>
              <span className="font-mono text-xs tabular-nums">
                Rendimentos {formatBRL(summary.totalIncome)} − Despesas{' '}
                {formatBRL(summary.totalExpenses)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Saldo Final:</span>
              <span
                className={`font-mono text-base font-bold tabular-nums ${
                  summary.finalBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatBRL(summary.finalBalance)}
              </span>
            </div>
          </div>
        </footer>
      </main>

      <EntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddEntry}
      />

      <OfflineIndicator />
    </div>
  );
}
