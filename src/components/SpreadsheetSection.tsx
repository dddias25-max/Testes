import { useState, type FormEvent } from 'react';
import { Check, Clock, Plus, Trash2 } from 'lucide-react';
import type { EntryKind, FinanceEntry } from '../types/finance';
import { formatBRL, parseCurrencyInput } from '../utils/finance';

interface SpreadsheetSectionProps {
  id: string;
  title: string;
  subtitle: string;
  kind: EntryKind;
  entries: FinanceEntry[];
  subtotal: number;
  categorySuggestions: string[];
  onUpdateEntry: (id: string, patch: Partial<FinanceEntry>) => void;
  onAddEntry: (entry: Omit<FinanceEntry, 'id'>) => void;
  onDeleteEntry: (id: string) => void;
}

export function SpreadsheetSection({
  id,
  title,
  subtitle,
  kind,
  entries,
  subtotal,
  categorySuggestions,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
}: SpreadsheetSectionProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'amount' | 'description' | 'day' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Quick-add inline row state
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState(categorySuggestions[0] ?? 'Geral');
  const [newDay, setNewDay] = useState('15');
  const [newAmount, setNewAmount] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);

  const isIncome = kind === 'income';

  const startEdit = (entry: FinanceEntry, field: 'amount' | 'description' | 'day') => {
    setEditingCell({ id: entry.id, field });
    if (field === 'amount') {
      setEditValue(entry.amount.toFixed(2).replace('.', ','));
    } else if (field === 'day') {
      setEditValue(String(entry.day));
    } else {
      setEditValue(entry.description);
    }
  };

  const commitEdit = (entry: FinanceEntry) => {
    if (!editingCell || editingCell.id !== entry.id) return;

    if (editingCell.field === 'amount') {
      const parsed = parseCurrencyInput(editValue);
      if (parsed !== null) {
        onUpdateEntry(entry.id, { amount: parsed });
      }
    } else if (editingCell.field === 'description') {
      const trimmed = editValue.trim();
      if (trimmed.length > 0) {
        onUpdateEntry(entry.id, { description: trimmed });
      }
    } else if (editingCell.field === 'day') {
      const dayNum = Number.parseInt(editValue, 10);
      if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31) {
        onUpdateEntry(entry.id, { day: dayNum });
      }
    }

    setEditingCell(null);
    setEditValue('');
  };

  const handleQuickAdd = (e: FormEvent) => {
    e.preventDefault();
    const desc = newDesc.trim();
    const parsedAmount = parseCurrencyInput(newAmount);
    const parsedDay = Number.parseInt(newDay, 10);

    if (!desc) {
      setQuickError('Informe a descrição do lançamento.');
      return;
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      setQuickError('Informe um valor válido maior que zero.');
      return;
    }

    const safeDay = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : 15;

    onAddEntry({
      description: desc,
      category: newCategory.trim() || 'Geral',
      kind,
      amount: parsedAmount,
      day: safeDay,
      status: isIncome ? 'paid' : 'pending',
    });

    setNewDesc('');
    setNewAmount('');
    setQuickError(null);
  };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-20 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      {/* Section Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id={`${id}-heading`} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-slate-500">Subtotal:</span>
          <span
            data-testid={`subtotal-${kind}`}
            className={`font-mono text-base font-semibold tabular-nums ${
              isIncome ? 'text-emerald-700' : 'text-slate-900'
            }`}
          >
            {formatBRL(subtotal)}
          </span>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <th scope="col" className="px-5 py-2.5">
                Descrição
              </th>
              <th scope="col" className="px-4 py-2.5">
                Categoria
              </th>
              <th scope="col" className="w-24 px-4 py-2.5 text-center">
                Dia
              </th>
              <th scope="col" className="w-36 px-4 py-2.5 text-center">
                Status
              </th>
              <th scope="col" className="w-44 px-4 py-2.5 text-right">
                Valor (R$)
              </th>
              <th scope="col" className="w-16 px-4 py-2.5 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                  Nenhum lançamento visível nesta seção com o filtro atual.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isEditingAmount =
                  editingCell?.id === entry.id && editingCell.field === 'amount';
                const isEditingDesc =
                  editingCell?.id === entry.id && editingCell.field === 'description';
                const isEditingDay =
                  editingCell?.id === entry.id && editingCell.field === 'day';

                const statusLabel = isIncome
                  ? entry.status === 'paid'
                    ? 'Recebido'
                    : 'A receber'
                  : entry.status === 'paid'
                    ? 'Pago'
                    : 'Pendente';

                return (
                  <tr
                    key={entry.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    {/* Description */}
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      {isEditingDesc ? (
                        <input
                          type="text"
                          autoFocus
                          aria-label={`Editar descrição de ${entry.description}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(entry)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(entry);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full rounded border border-teal-600 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(entry, 'description')}
                          aria-label={`Editar descrição ${entry.description}`}
                          className="w-full rounded px-1 py-0.5 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-text"
                        >
                          {entry.description}
                        </button>
                      )}
                    </td>

                    {/* Category (clean unboxed text) */}
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {entry.category}
                    </td>

                    {/* Day */}
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-600 tabular-nums">
                      {isEditingDay ? (
                        <input
                          type="number"
                          min={1}
                          max={31}
                          autoFocus
                          aria-label={`Editar dia de ${entry.description}`}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(entry)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(entry);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-14 rounded border border-teal-600 bg-white px-1.5 py-0.5 text-center font-mono text-xs text-slate-900 focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(entry, 'day')}
                          aria-label={`Editar dia de ${entry.description}`}
                          className="rounded px-2 py-1 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-text"
                        >
                          Dia {String(entry.day).padStart(2, '0')}
                        </button>
                      )}
                    </td>

                    {/* Interactive Status Toggle Button */}
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEntry(entry.id, {
                            status: entry.status === 'paid' ? 'pending' : 'paid',
                          })
                        }
                        aria-label={`Alternar status de ${entry.description}, atualmente ${statusLabel}`}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          entry.status === 'paid'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {entry.status === 'paid' ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{statusLabel}</span>
                      </button>
                    </td>

                    {/* Inline Editable BRL Amount */}
                    <td className="px-4 py-2.5 text-right">
                      {isEditingAmount ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          aria-label={`Valor de ${entry.description}`}
                          value={editValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(entry)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(entry);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-32 rounded border border-teal-600 bg-white px-2 py-1 text-right font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(entry, 'amount')}
                          aria-label={`Editar valor de ${entry.description}, atual ${formatBRL(entry.amount)}`}
                          className={`inline-block rounded px-2 py-1 font-mono text-sm font-medium tabular-nums transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 cursor-text ${
                            isIncome ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {formatBRL(entry.amount)}
                        </button>
                      )}
                    </td>

                    {/* Delete Action */}
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`Excluir ${entry.description}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Inline Quick Add Form */}
      <form
        onSubmit={handleQuickAdd}
        className="border-t border-slate-200 bg-slate-50/50 px-5 py-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newDesc}
            onChange={(e) => {
              setNewDesc(e.target.value);
              if (quickError) setQuickError(null);
            }}
            placeholder={`Adicionar em ${title.toLowerCase()}...`}
            aria-label={`Descrição para novo item em ${title}`}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
          />

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            aria-label={`Categoria para novo item em ${title}`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-teal-700 focus:outline-none"
          >
            {categorySuggestions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            max={31}
            value={newDay}
            onChange={(e) => setNewDay(e.target.value)}
            aria-label={`Dia do mês para novo item em ${title}`}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center font-mono text-sm text-slate-800 sm:w-20 focus:border-teal-700 focus:outline-none"
          />

          <input
            type="text"
            inputMode="decimal"
            value={newAmount}
            onChange={(e) => {
              setNewAmount(e.target.value);
              if (quickError) setQuickError(null);
            }}
            placeholder="0,00"
            aria-label={`Valor em reais para novo item em ${title}`}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right font-mono text-sm text-slate-900 placeholder:text-slate-400 sm:w-32 focus:border-teal-700 focus:outline-none"
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Adicionar</span>
          </button>
        </div>

        {quickError && (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
            {quickError}
          </p>
        )}
      </form>
    </section>
  );
}
