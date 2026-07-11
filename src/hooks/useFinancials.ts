import { useMemo } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { useSettingsStore } from '../store/settingsStore';
import { calculateBalance, calculateForecast } from '../utils/calculations';
import { normalizeTransactionsToCurrency } from '../utils/currency';
import { withComputedSpent } from '../utils/budget';
import type { BudgetLimit, Transaction } from '../types';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Транзакции могли быть созданы в разной валюте (если пользователь менял валюту в настройках),
// поэтому перед любой сводной цифрой (баланс, сумма по категориям, прогноз) их нужно привести
// к одной, текущей валюте отображения — иначе суммирование 100 ₽ и 100 $ как «200» было бы неверным.
function useNormalizedTransactions(): Transaction[] {
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  return useMemo(
    () => normalizeTransactionsToCurrency(transactions, currency, rates),
    [transactions, currency, rates]
  );
}

export function useFreeFunds(): number {
  const transactions = useNormalizedTransactions();
  const credits = useFinanceStore((s) => s.credits);
  const goals = useFinanceStore((s) => s.goals);

  return useMemo(() => {
    // Формула из ТЗ: Доходы − Расходы − Кредиты − Отчисления в цели.
    // "Кредиты" трактуем как сумму ежемесячных платежей по активным кредитам,
    // "Отчисления в цели" — как уже отложенную (savedAmount) сумму по всем целям.
    const balance = calculateBalance(transactions);
    const creditObligations = credits.reduce((sum, c) => sum + c.monthlyPayment, 0);
    const goalContributions = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    return balance - creditObligations - goalContributions;
  }, [transactions, credits, goals]);
}

export function useTodaySummary(): { income: number; expense: number } {
  const transactions = useNormalizedTransactions();
  return useMemo(() => {
    const today = new Date();
    const todaysTx = transactions.filter((t) => isSameDay(t.date, today));
    return {
      income: todaysTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: todaysTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }, [transactions]);
}

export function useRecentTransactions(count = 5): Transaction[] {
  const transactions = useNormalizedTransactions();
  return useMemo(() => transactions.slice(0, count), [transactions, count]);
}

export interface CategoryTotal {
  category: string;
  total: number;
  percent: number;
}

export function useTopCategories(type: 'income' | 'expense', count = 3): CategoryTotal[] {
  const transactions = useNormalizedTransactions();
  return useMemo(() => {
    const filtered = transactions.filter((t) => t.type === type);
    const totalsByCategory = new Map<string, number>();
    for (const t of filtered) {
      totalsByCategory.set(t.category, (totalsByCategory.get(t.category) ?? 0) + t.amount);
    }
    const grandTotal = filtered.reduce((sum, t) => sum + t.amount, 0);
    return Array.from(totalsByCategory.entries())
      .map(([category, total]) => ({
        category,
        total,
        percent: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, count);
  }, [transactions, type, count]);
}

export function useForecast(months = 1): number {
  const transactions = useNormalizedTransactions();
  return useMemo(() => calculateForecast(transactions, months), [transactions, months]);
}

export function useBudgetLimitsWithSpent(): BudgetLimit[] {
  const limits = useFinanceStore((s) => s.budgetLimits);
  const transactions = useNormalizedTransactions();
  return useMemo(() => withComputedSpent(limits, transactions), [limits, transactions]);
}
