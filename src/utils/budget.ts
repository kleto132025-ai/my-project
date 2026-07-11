import type { BudgetLimit, BudgetPeriod, Transaction } from '../types';

const GENERAL_LIMIT_CATEGORY = 'Общий лимит';

// Лимиты создавались с полем spent, но реальные расходы туда никогда не дописываются —
// после сохранения новой транзакции соответствующий лимит не обновлялся, и прогресс-бар
// в бюджете застывал на значении из демо-данных. Вместо синхронизации двух источников правды
// (BudgetLimit.spent и Transaction[]) считаем потраченное прямо из транзакций за календарный период.
export function getCalendarPeriodRange(period: BudgetPeriod, now: Date = new Date()): { start: Date; end: Date } {
  if (period === 'month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { start: new Date(now.getFullYear(), quarterStartMonth, 1), end: now };
  }
  return { start: new Date(now.getFullYear(), 0, 1), end: now };
}

export function calculateSpentForLimit(transactions: Transaction[], limit: BudgetLimit): number {
  const { start, end } = getCalendarPeriodRange(limit.period);
  return transactions
    .filter((t) => t.type === 'expense' && t.date >= start && t.date <= end)
    .filter((t) => limit.category === GENERAL_LIMIT_CATEGORY || t.category === limit.category)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function withComputedSpent(limits: BudgetLimit[], transactions: Transaction[]): BudgetLimit[] {
  return limits.map((limit) => ({ ...limit, spent: calculateSpentForLimit(transactions, limit) }));
}
