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

  // Свободные средства — это просто остаток после расходов (доходы минус расходы),
  // без вычета кредитных платежей и отчислений в цели: пользователь ожидает увидеть
  // здесь именно то, что у него реально осталось на руках, а не гипотетический остаток
  // после ещё не совершённых списаний.
  return useMemo(() => calculateBalance(transactions), [transactions]);
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

export interface DebtSummary {
  creditsRemaining: number;
  mortgageRemaining: number;
  totalRemaining: number;
}

export function useDebtSummary(): DebtSummary {
  const credits = useFinanceStore((s) => s.credits);
  return useMemo(() => {
    const creditsRemaining = credits.filter((c) => c.kind === 'credit').reduce((sum, c) => sum + c.remaining, 0);
    const mortgageRemaining = credits.filter((c) => c.kind === 'mortgage').reduce((sum, c) => sum + c.remaining, 0);
    return { creditsRemaining, mortgageRemaining, totalRemaining: creditsRemaining + mortgageRemaining };
  }, [credits]);
}

export interface InvestmentsSummary {
  /** Текущая стоимость портфеля: количество × текущая цена по всем активам. */
  totalValue: number;
  /** Сумма всех полученных дивидендов и купонов по всем активам. */
  totalPayouts: number;
}

export function useInvestmentsSummary(): InvestmentsSummary {
  const investments = useFinanceStore((s) => s.investments);
  const investmentPayouts = useFinanceStore((s) => s.investmentPayouts);
  return useMemo(() => {
    const totalValue = investments.reduce((sum, i) => sum + i.quantity * i.currentPrice, 0);
    const totalPayouts = investmentPayouts.reduce((sum, p) => sum + p.amount, 0);
    return { totalValue, totalPayouts };
  }, [investments, investmentPayouts]);
}

export interface NetWorth {
  /** Остаток ДС по текущим счетам (доходы минус расходы по всем транзакциям). */
  cash: number;
  savingsAccounts: number;
  deposits: number;
  investments: number;
  /** Собственный капитал по ипотекам: (текущая стоимость − остаток долга), либо просто
   *  −остаток, если текущая стоимость объекта не указана — тогда актив не оценён и в
   *  капитал не добавляется, но долг по нему всё равно учитывается. */
  mortgageEquity: number;
  /** Остаток долга по обычным кредитам (не ипотекам). */
  creditDebt: number;
  goalsSaved: number;
  total: number;
}

export function useNetWorth(): NetWorth {
  const cash = useFreeFunds();
  const investmentsSummary = useInvestmentsSummary();
  const savingsAccountsList = useFinanceStore((s) => s.savingsAccounts);
  const deposits = useFinanceStore((s) => s.deposits);
  const goals = useFinanceStore((s) => s.goals);
  const credits = useFinanceStore((s) => s.credits);

  return useMemo(() => {
    const savingsAccountsTotal = savingsAccountsList.reduce((sum, a) => sum + a.balance, 0);
    const depositsTotal = deposits.reduce((sum, d) => sum + d.amount, 0);
    const goalsSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const mortgageEquity = credits
      .filter((c) => c.kind === 'mortgage')
      .reduce((sum, c) => sum + (c.currentValue != null ? c.currentValue - c.remaining : -c.remaining), 0);
    const creditDebt = credits.filter((c) => c.kind === 'credit').reduce((sum, c) => sum + c.remaining, 0);
    const total =
      cash +
      savingsAccountsTotal +
      depositsTotal +
      investmentsSummary.totalValue +
      goalsSaved +
      mortgageEquity -
      creditDebt;
    return {
      cash,
      savingsAccounts: savingsAccountsTotal,
      deposits: depositsTotal,
      investments: investmentsSummary.totalValue,
      mortgageEquity,
      creditDebt,
      goalsSaved,
      total,
    };
  }, [cash, investmentsSummary, savingsAccountsList, deposits, goals, credits]);
}
