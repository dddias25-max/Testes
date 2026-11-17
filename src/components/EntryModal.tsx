import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { EntryKind, EntryStatus, FinanceEntry } from '../types/finance';
import { parseCurrencyInput } from '../utils/finance';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entry: Omit<FinanceEntry, 'id'>) => void;
}

const CATEGORIES_BY_KIND: Record<EntryKind, string[]> = {
  income: ['Trabalho Principal', 'Renda Extra', 'Freelance', 'Outros Rendimentos'],
  fixed: ['Moradia', 'Conectividade', 'Transporte', 'Educação / Saúde', 'Outros Fixos'],
  variable: ['Transporte', 'Alimentação', 'Lazer', 'Compras', 'Outros Variáveis'],
};

export function EntryModal({ isOpen, onClose, onSubmit }: EntryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<EntryKind>('variable');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES_BY_KIND.variable[0]);
  const [day, setDay] = useState('15');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<EntryStatus>('paid');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleKindChange = (nextKind: EntryKind) => {
    setKind(nextKind);
    setCategory(CATEGORIES_BY_KIND[nextKind][0]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    const parsedAmount = parseCurrencyInput(amount);
    const parsedDay = Number.parseInt(day, 10);

    if (!trimmed) {
      setError('Digite uma descrição para o lançamento.');
      return;
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError('Informe um dia entre 1 e 31.');
      return;
    }

    onSubmit({
      description: trimmed,
      category,
      kind,
      amount: parsedAmount,
      day: parsedDay,
      status,
    });

    setDescription('');
    setAmount('');
    setError(null);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-950/40"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="modal-title" className="text-base font-semibold text-slate-900">
          Novo Lançamento Mensal
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar janela de novo lançamento"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <span className="block text-xs font-medium text-slate-700">Tipo de lançamento</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
            {(
              [
                { value: 'income', label: 'Rendimento' },
                { value: 'fixed', label: 'Despesa Fixa' },
                { value: 'variable', label: 'Variável' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleKindChange(opt.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  kind === opt.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="modal-desc" className="block text-xs font-medium text-slate-700">
            Descrição
          </label>
          <input
            id="modal-desc"
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Ex.: Abastecimento extra, Bônus, Manutenção"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-cat" className="block text-xs font-medium text-slate-700">
              Categoria
            </label>
            <select
              id="modal-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              {CATEGORIES_BY_KIND[kind].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="modal-day" className="block text-xs font-medium text-slate-700">
              Dia do mês
            </label>
            <input
              id="modal-day"
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-amount" className="block text-xs font-medium text-slate-700">
              Valor (R$)
            </label>
            <input
              id="modal-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              placeholder="0,00"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="modal-status" className="block text-xs font-medium text-slate-700">
              Status
            </label>
            <select
              id="modal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EntryStatus)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              <option value="paid">{kind === 'income' ? 'Recebido' : 'Pago'}</option>
              <option value="pending">{kind === 'income' ? 'A receber' : 'Pendente'}</option>
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 cursor-pointer"
          >
            Salvar lançamento
          </button>
        </div>
      </form>
    </dialog>
  );
}
