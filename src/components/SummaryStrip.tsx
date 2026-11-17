import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { MonthlySummary } from '../types/finance';
import { formatBRL } from '../utils/finance';

interface SummaryStripProps {
  summary: MonthlySummary;
}

export function SummaryStrip({ summary }: SummaryStripProps) {
  const isPositive = summary.finalBalance >= 0;
  const fixedShare =
    summary.totalExpenses > 0
      ? Math.round((summary.totalFixed / summary.totalExpenses) * 100)
      : 0;
  const variableShare =
    summary.totalExpenses > 0 ? 100 - fixedShare : 0;

  const formattedSavingsRate = Math.abs(summary.savingsRate).toFixed(1).replace('.', ',');

  return (
    <section id="resumo" aria-label="Resumo financeiro do mês" className="scroll-mt-20">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Rendimentos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Rendimentos Totais</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-income"
            className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
          >
            {formatBRL(summary.totalIncome)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            Entradas registradas no mês
          </p>
        </div>

        {/* Despesas Fixas */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Despesas Fixas</span>
            <Minus className="h-4 w-4 text-slate-500" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-fixed"
            className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
          >
            {formatBRL(summary.totalFixed)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {fixedShare}% das despesas · Contas essenciais
          </p>
        </div>

        {/* Gastos Variáveis */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Gastos Variáveis</span>
            <ArrowDownRight className="h-4 w-4 text-amber-700" aria-hidden="true" />
          </div>
          <p
            data-testid="kpi-variable"
            className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums"
          >
            {formatBRL(summary.totalVariable)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {variableShare}% das despesas · Consumo do mês
          </p>
        </div>

        {/* Saldo Final do Mês */}
        <div
          className={`rounded-xl border p-5 ${
            isPositive
              ? 'border-emerald-200 bg-emerald-50/40'
              : 'border-rose-200 bg-rose-50/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Saldo Final do Mês</span>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-700" aria-hidden="true" />
            )}
          </div>
          <p
            data-testid="kpi-balance"
            className={`mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
              isPositive ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {formatBRL(summary.finalBalance)}
          </p>
          <p
            className={`mt-1.5 text-xs font-medium tabular-nums ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isPositive
              ? `Saldo positivo · ${formattedSavingsRate}% da renda livre`
              : `Saldo negativo · ${formattedSavingsRate}% acima da renda`}
          </p>
        </div>
      </div>
    </section>
  );
}
