import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyTrend,
  calculateMonthlySummary,
  cloneRecurringFromMonth,
  createBlankMonthLedger,
  createSeedStore,
  formatBRL,
  formatMonthLabel,
  generateMonthCSV,
  parseCurrencyInput,
  shiftMonthKey,
} from './finance';

test('parseCurrencyInput parses Brazilian and standard decimal formats', () => {
  assert.equal(parseCurrencyInput('184,60'), 184.6);
  assert.equal(parseCurrencyInput('R$ 1.250,75'), 1250.75);
  assert.equal(parseCurrencyInput('1.200'), 1200);
  assert.equal(parseCurrencyInput('450.25'), 450.25);
  assert.equal(parseCurrencyInput('0'), 0);
  assert.equal(parseCurrencyInput(''), null);
  assert.equal(parseCurrencyInput('-50'), null);
  assert.equal(parseCurrencyInput('abc'), null);
});

test('calculateMonthlySummary computes income, fixed, variable, and positive final balance', () => {
  const store = createSeedStore('2026-11');
  const summary = calculateMonthlySummary(store['2026-11']);

  assert.equal(summary.totalIncome, 4450);
  assert.equal(summary.totalFixed, 1125.8);
  assert.equal(summary.totalVariable, 1105.4);
  assert.equal(summary.totalExpenses, 2231.2);
  assert.equal(summary.finalBalance, 2218.8);
  assert.equal(summary.paidExpenses, 1486.3);
  assert.equal(summary.pendingExpenses, 744.9);
  assert.equal(summary.breakdown.length, 7);
});

test('calculateMonthlySummary detects deficit when expenses exceed income', () => {
  const ledger = createBlankMonthLedger('2026-12');
  ledger.entries[0].amount = 2000; // Salário
  ledger.entries[5].amount = 1500; // Financiamento da Moto
  ledger.entries[7].amount = 900; // Mercado

  const summary = calculateMonthlySummary(ledger);
  assert.equal(summary.totalIncome, 2000);
  assert.equal(summary.totalExpenses, 2400);
  assert.equal(summary.finalBalance, -400);
  assert.equal(summary.savingsRate, -20);
});

test('createBlankMonthLedger includes all required fixed and variable categories', () => {
  const blank = createBlankMonthLedger('2026-12');
  const names = blank.entries.map((e) => e.description);

  for (const required of [
    'Energia Elétrica',
    'Internet',
    'Água',
    'Plano do Celular',
    'Financiamento da Moto',
    'Combustível',
    'Mercado',
  ]) {
    assert.ok(names.includes(required), `Missing required entry: ${required}`);
  }
});

test('shiftMonthKey and formatMonthLabel handle year boundaries cleanly', () => {
  assert.equal(shiftMonthKey('2026-12', 1), '2027-01');
  assert.equal(shiftMonthKey('2026-01', -1), '2025-12');
  assert.equal(formatMonthLabel('2026-11'), 'Novembro 2026');
  assert.match(formatBRL(1234.56), /1\.234,56/);
});

test('cloneRecurringFromMonth preserves fixed/income amounts and resets variable and status', () => {
  const store = createSeedStore('2026-11');
  const cloned = cloneRecurringFromMonth(store['2026-11'], '2026-12');

  const moto = cloned.entries.find((e) => e.description === 'Financiamento da Moto');
  const mercado = cloned.entries.find((e) => e.description === 'Mercado');
  assert.equal(moto?.amount, 685);
  assert.equal(moto?.status, 'pending');
  assert.equal(mercado?.amount, 0);
  assert.equal(mercado?.status, 'pending');
});

test('buildMonthlyTrend returns chronological multi-month points and generateMonthCSV formats summary', () => {
  const store = createSeedStore('2026-11');
  const trend = buildMonthlyTrend(store, '2026-11', 4);
  assert.equal(trend.length, 4);
  assert.deepEqual(
    trend.map((p) => p.monthKey),
    ['2026-08', '2026-09', '2026-10', '2026-11']
  );
  assert.ok(trend.every((p) => p.totalIncome > 0 && p.totalExpenses > 0));

  const csv = generateMonthCSV(store['2026-11']);
  assert.ok(csv.includes('Energia Elétrica'));
  assert.ok(csv.includes('Financiamento da Moto'));
  assert.ok(csv.includes('Saldo Final do Mês'));
});
