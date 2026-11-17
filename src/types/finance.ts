export type EntryKind = 'income' | 'fixed' | 'variable';

export type EntryStatus = 'paid' | 'pending';

export interface FinanceEntry {
  id: string;
  description: string;
  category: string;
  kind: EntryKind;
  amount: number;
  day: number;
  status: EntryStatus;
  notes?: string;
  isCore?: boolean;
}

export interface MonthLedger {
  monthKey: string; // YYYY-MM
  entries: FinanceEntry[];
}

export type LedgerStore = Record<string, MonthLedger>;

export interface CategoryBreakdownItem {
  id: string;
  description: string;
  category: string;
  kind: 'fixed' | 'variable';
  amount: number;
  shareOfExpenses: number; // percentage 0..100
}

export interface MonthlySummary {
  monthKey: string;
  totalIncome: number;
  totalFixed: number;
  totalVariable: number;
  totalExpenses: number;
  finalBalance: number;
  paidExpenses: number;
  pendingExpenses: number;
  savingsRate: number; // percentage (-100..100)
  expenseToIncomeRatio: number; // percentage
  breakdown: CategoryBreakdownItem[];
}

export interface MonthlyTrendPoint {
  monthKey: string;
  shortLabel: string;
  fullLabel: string;
  totalIncome: number;
  totalFixed: number;
  totalVariable: number;
  totalExpenses: number;
  finalBalance: number;
}
