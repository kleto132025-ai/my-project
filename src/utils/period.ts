import type { Transaction } from '../types';

export type ExportPeriod = 'all' | 'this_month' | 'last_month' | 'this_year';

export const EXPORT_PERIOD_LABELS: Record<ExportPeriod, string> = {
  all: 'Всё время',
  this_month: 'Этот месяц',
  last_month: 'Прошлый месяц',
  this_year: 'Этот год',
};

// Границы периода для экспорта отчёта (CSV/PDF) — выбираются пользователем перед экспортом,
// чтобы не приходилось каждый раз выгружать весь список транзакций целиком.
function periodRange(period: ExportPeriod, now: Date): { start: Date; end: Date } | null {
  if (period === 'all') return null;
  if (period === 'this_month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  if (period === 'last_month') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: ExportPeriod,
  now: Date = new Date()
): Transaction[] {
  const range = periodRange(period, now);
  if (!range) return transactions;
  return transactions.filter((t) => t.date >= range.start && t.date < range.end);
}
