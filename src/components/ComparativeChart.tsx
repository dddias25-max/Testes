import { useState } from 'react';
import type { MonthlySummary, MonthlyTrendPoint } from '../types/finance';
import { formatBRL, formatCompactBRL, formatMonthLabel } from '../utils/finance';

interface ComparativeChartProps {
  summary: MonthlySummary;
  trend: MonthlyTrendPoint[];
  activeMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
}

type ChartMode = 'month' | 'trend';

export function ComparativeChart({
  summary,
  trend,
  activeMonthKey,
  onSelectMonth,
}: ComparativeChartProps) {
  const [mode, setMode] = useState<ChartMode>('month');
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);

  const balancePositive = summary.finalBalance >= 0;

  const monthBars = [
    {
      key: 'income',
      label: 'Rendimentos',
      value: summary.totalIncome,
      color: '#059669',
      sublabel: 'Total de entradas',
    },
    {
      key: 'fixed',
      label: 'Despesas Fixas',
      value: summary.totalFixed,
      color: '#334155',
      sublabel: 'Energia, internet, água, celular, moto',
    },
    {
      key: 'variable',
      label: 'Gastos Variáveis',
      value: summary.totalVariable,
      color: '#D97706',
      sublabel: 'Combustível, mercado e outros',
    },
    {
      key: 'expenses',
      label: 'Total Despesas',
      value: summary.totalExpenses,
      color: '#64748B',
      sublabel: 'Fixas + Variáveis somadas',
    },
    {
      key: 'balance',
      label: 'Saldo Final',
      value: summary.finalBalance,
      color: balancePositive ? '#0F766E' : '#DC2626',
      sublabel: balancePositive ? 'Sobra no fim do mês' : 'Déficit no mês',
    },
  ];

  // SVG coordinate space for single-month chart
  const svgW = 680;
  const svgH = 290;
  const padL = 72;
  const padR = 24;
  const padT = 28;
  const padB = 46;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const maxAbsMonth = Math.max(
    100,
    ...monthBars.map((b) => Math.abs(b.value))
  );
  const hasNegative = monthBars.some((b) => b.value < 0);
  const minVal = hasNegative ? -Math.ceil(maxAbsMonth * 0.35) : 0;
  const maxVal = Math.ceil(maxAbsMonth * 1.12);
  const span = maxVal - minVal || 1;

  const yForValue = (val: number) =>
    padT + ((maxVal - val) / span) * plotH;
  const zeroY = yForValue(0);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = minVal + t * span;
    return { val, y: yForValue(val) };
  });

  const activeBarInfo = monthBars.find((b) => b.key === hoveredBarKey) ?? monthBars[4];

  // Multi-month trend scale (wider viewBox to fit cleanly inside viewport)
  const trendW = 960;
  const trendH = 265;
  const trendPadL = 74;
  const trendPadR = 28;
  const trendPadT = 28;
  const trendPadB = 42;
  const trendPlotW = trendW - trendPadL - trendPadR;
  const trendPlotH = trendH - trendPadT - trendPadB;

  const maxTrend = Math.max(
    100,
    ...trend.flatMap((p) => [p.totalIncome, p.totalExpenses, Math.abs(p.finalBalance)])
  );
  const trendHasNegative = trend.some((p) => p.finalBalance < 0);
  const trendMin = trendHasNegative ? -Math.ceil(maxTrend * 0.35) : 0;
  const trendMax = Math.ceil(maxTrend * 1.15);
  const trendSpan = trendMax - trendMin || 1;
  const yTrend = (val: number) => trendPadT + ((trendMax - val) / trendSpan) * trendPlotH;
  const trendZeroY = yTrend(0);

  return (
    <section
      id="grafico-comparativo"
      aria-label="Gráfico comparativo de rendimentos, despesas e saldo final"
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Gráfico Comparativo — {formatMonthLabel(activeMonthKey)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Comparação direta entre rendimentos, despesas fixas, gastos variáveis e saldo final do mês
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Modo de visualização do gráfico"
          className="inline-flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'month'}
            onClick={() => setMode('month')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Comparativo do Mês
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'trend'}
            onClick={() => setMode('trend')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'trend'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evolução 4 Meses
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          {/* Bar Comparison Chart */}
          <div className="p-5 lg:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-medium text-slate-900">{activeBarInfo.label}:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatBRL(activeBarInfo.value)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">{activeBarInfo.sublabel}</span>
              </div>
              <span className="font-mono text-slate-500 tabular-nums">
                Pago: {formatBRL(summary.paidExpenses)} · Pendente: {formatBRL(summary.pendingExpenses)}
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="h-auto w-full min-w-[480px]"
                role="img"
                aria-label="Gráfico de barras comparando rendimentos, despesas fixas, gastos variáveis, total de despesas e saldo final"
              >
                {/* Grid lines */}
                {ticks.map((tick, idx) => (
                  <g key={idx}>
                    <line
                      x1={padL}
                      x2={svgW - padR}
                      y1={tick.y}
                      y2={tick.y}
                      stroke="#E2E8F0"
                      strokeDasharray={Math.abs(tick.val) < 1 ? undefined : '3 3'}
                      strokeWidth={1}
                    />
                    <text
                      x={padL - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[11px] font-mono tabular-nums"
                    >
                      {formatCompactBRL(tick.val)}
                    </text>
                  </g>
                ))}

                {/* Zero baseline */}
                <line
                  x1={padL}
                  x2={svgW - padR}
                  y1={zeroY}
                  y2={zeroY}
                  stroke="#94A3B8"
                  strokeWidth={1.25}
                />

                {/* Bars */}
                {monthBars.map((bar, idx) => {
                  const slotW = plotW / monthBars.length;
                  const barW = Math.min(64, slotW * 0.56);
                  const x = padL + idx * slotW + (slotW - barW) / 2;
                  const barTop = bar.value >= 0 ? yForValue(bar.value) : zeroY;
                  const barBottom = bar.value >= 0 ? zeroY : yForValue(bar.value);
                  const barH = Math.max(2, barBottom - barTop);
                  const isHovered = hoveredBarKey === bar.key;
                  const labelY = bar.value >= 0 ? barTop - 8 : barBottom + 14;

                  return (
                    <g
                      key={bar.key}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredBarKey(bar.key)}
                      onMouseLeave={() => setHoveredBarKey(null)}
                      onFocus={() => setHoveredBarKey(bar.key)}
                      onBlur={() => setHoveredBarKey(null)}
                      className="cursor-pointer outline-none"
                    >
                      <rect
                        x={x}
                        y={barTop}
                        width={barW}
                        height={barH}
                        rx={5}
                        fill={bar.color}
                        opacity={hoveredBarKey && !isHovered ? 0.55 : 1}
                      />
                      <text
                        x={x + barW / 2}
                        y={labelY}
                        textAnchor="middle"
                        className="fill-slate-800 text-[11px] font-mono font-semibold tabular-nums"
                      >
                        {formatCompactBRL(bar.value)}
                      </text>
                      <text
                        x={x + barW / 2}
                        y={svgH - 16}
                        textAnchor="middle"
                        className="fill-slate-700 text-[12px] font-medium"
                      >
                        {bar.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Composition Breakdown */}
          <div className="p-5 lg:col-span-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Peso de cada despesa</h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Total: {formatBRL(summary.totalExpenses)}
              </span>
            </div>

            {summary.breakdown.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                Nenhuma despesa cadastrada neste mês.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {summary.breakdown.slice(0, 7).map((item) => (
                  <div key={item.id}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-slate-800">
                        {item.description}
                      </span>
                      <span className="shrink-0 font-mono text-slate-700 tabular-nums">
                        {formatBRL(item.amount)} ({item.shareOfExpenses.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          item.kind === 'fixed' ? 'bg-slate-700' : 'bg-amber-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, item.shareOfExpenses))}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-slate-700" aria-hidden="true" />
                    Despesa Fixa
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-amber-600" aria-hidden="true" />
                    Gasto Variável
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                Rendimentos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-500" aria-hidden="true" />
                Despesas Totais
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-teal-700" aria-hidden="true" />
                Saldo Final
              </span>
            </div>
            <span>Clique em um mês abaixo para abrir a planilha correspondente</span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${trendW} ${trendH}`}
              className="h-auto max-h-[290px] w-full min-w-[540px]"
              role="img"
              aria-label="Evolução comparativa de rendimentos, despesas e saldo final nos últimos 4 meses"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
                const val = trendMin + t * trendSpan;
                const y = yTrend(val);
                return (
                  <g key={idx}>
                    <line
                      x1={trendPadL}
                      x2={trendW - trendPadR}
                      y1={y}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <text
                      x={trendPadL - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[12px] font-mono tabular-nums"
                    >
                      {formatCompactBRL(val)}
                    </text>
                  </g>
                );
              })}

              <line
                x1={trendPadL}
                x2={trendW - trendPadR}
                y1={trendZeroY}
                y2={trendZeroY}
                stroke="#94A3B8"
                strokeWidth={1.25}
              />

              {trend.map((pt, idx) => {
                const groupW = trendPlotW / trend.length;
                const innerGap = 8;
                const barW = Math.min(36, (groupW * 0.65 - innerGap * 2) / 3);
                const groupStart =
                  trendPadL + idx * groupW + (groupW - (barW * 3 + innerGap * 2)) / 2;
                const isSelected = pt.monthKey === activeMonthKey;

                const series = [
                  { val: pt.totalIncome, color: '#059669' },
                  { val: pt.totalExpenses, color: '#64748B' },
                  { val: pt.finalBalance, color: pt.finalBalance >= 0 ? '#0F766E' : '#DC2626' },
                ];

                return (
                  <g
                    key={pt.monthKey}
                    onClick={() => onSelectMonth(pt.monthKey)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <rect
                        x={trendPadL + idx * groupW + 10}
                        y={trendPadT - 10}
                        width={groupW - 20}
                        height={trendPlotH + 16}
                        rx={8}
                        fill="#F1F5F9"
                      />
                    )}
                    {series.map((s, sIdx) => {
                      const x = groupStart + sIdx * (barW + innerGap);
                      const top = s.val >= 0 ? yTrend(s.val) : trendZeroY;
                      const bottom = s.val >= 0 ? trendZeroY : yTrend(s.val);
                      const h = Math.max(2, bottom - top);
                      const labelY = s.val >= 0 ? top - 6 : bottom + 13;
                      return (
                        <g key={sIdx}>
                          <rect
                            x={x}
                            y={top}
                            width={barW}
                            height={h}
                            rx={4}
                            fill={s.color}
                          />
                          <text
                            x={x + barW / 2}
                            y={labelY}
                            textAnchor="middle"
                            className="fill-slate-700 text-[10px] font-mono font-medium tabular-nums"
                          >
                            {formatCompactBRL(s.val)}
                          </text>
                        </g>
                      );
                    })}
                    <text
                      x={trendPadL + idx * groupW + groupW / 2}
                      y={trendH - 12}
                      textAnchor="middle"
                      className={`text-[13px] ${
                        isSelected ? 'fill-teal-800 font-semibold' : 'fill-slate-700 font-medium'
                      }`}
                    >
                      {pt.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
