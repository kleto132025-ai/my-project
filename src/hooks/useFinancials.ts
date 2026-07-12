import { useMemo } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { useSettingsStore } from '../store/settingsStore';
import { calculateBalance, calculateForecast, calculateMortgageProfit, simulateAmortization } from '../utils/calculations';
import { normalizeTransactionsToCurrency, convertAmount } from '../utils/currency';
import { withComputedSpent } from '../utils/budget';
import type { BudgetLimit, Transaction, Currency } from '../types';

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
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  return useMemo(() => {
    const toDisplay = (c: { remaining: number; currency: Currency }) =>
      convertAmount(c.remaining, c.currency, currency, rates);
    const creditsRemaining = credits.filter((c) => c.kind === 'credit').reduce((sum, c) => sum + toDisplay(c), 0);
    const mortgageRemaining = credits.filter((c) => c.kind === 'mortgage').reduce((sum, c) => sum + toDisplay(c), 0);
    return { creditsRemaining, mortgageRemaining, totalRemaining: creditsRemaining + mortgageRemaining };
  }, [credits, currency, rates]);
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
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  return useMemo(() => {
    const totalValue = investments.reduce(
      (sum, i) => sum + convertAmount(i.quantity * i.currentPrice, i.currency, currency, rates),
      0
    );
    // Выплаты (дивиденды/купоны) не хранят собственную валюту — считаются в валюте актива,
    // к которому относятся.
    const totalPayouts = investmentPayouts.reduce((sum, p) => {
      const investment = investments.find((i) => i.id === p.investmentId);
      const payoutCurrency = investment?.currency ?? currency;
      return sum + convertAmount(p.amount, payoutCurrency, currency, rates);
    }, 0);
    return { totalValue, totalPayouts };
  }, [investments, investmentPayouts, currency, rates]);
}

export interface NetWorth {
  /** Остаток ДС по текущим счетам (доходы минус расходы по всем транзакциям). */
  cash: number;
  savingsAccounts: number;
  deposits: number;
  investments: number;
  total: number;
}

// Намеренно не включает ни ипотеку/кредиты, ни цели — только "живые" деньги, которыми
// можно свободно распорядиться: остаток на счетах, накопительные счета, вклады, инвестиции.
// Актив по ипотеке — отдельная сущность (см. useMortgageAssets), у него другая природа
// (недвижимость, а не ликвидные накопления), поэтому он в этот общий капитал не сводится.
export function useNetWorth(): NetWorth {
  const cash = useFreeFunds();
  const investmentsSummary = useInvestmentsSummary();
  const savingsAccountsList = useFinanceStore((s) => s.savingsAccounts);
  const deposits = useFinanceStore((s) => s.deposits);
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);

  return useMemo(() => {
    const savingsAccountsTotal = savingsAccountsList.reduce(
      (sum, a) => sum + convertAmount(a.balance, a.currency, currency, rates),
      0
    );
    const depositsTotal = deposits.reduce((sum, d) => sum + convertAmount(d.amount, d.currency, currency, rates), 0);
    const total = cash + savingsAccountsTotal + depositsTotal + investmentsSummary.totalValue;
    return {
      cash,
      savingsAccounts: savingsAccountsTotal,
      deposits: depositsTotal,
      investments: investmentsSummary.totalValue,
      total,
    };
  }, [cash, investmentsSummary, savingsAccountsList, deposits, currency, rates]);
}

export interface MortgageAsset {
  id: string;
  name: string;
  currentValue: number;
  remaining: number;
  netProfit: number;
  netProfitPercent: number;
  saleProceeds: number;
}

// Отдельная сводка по ипотечной недвижимости — сколько объект реально стоит сегодня и
// насколько он "прирос" с учётом понесённых расходов (проценты, ремонт, страховка).
// Включает только ипотеки, где заполнена "Текущая рыночная стоимость объекта" — без неё
// прирост посчитать невозможно.
export function useMortgageAssets(): MortgageAsset[] {
  const credits = useFinanceStore((s) => s.credits);
  const creditRepayments = useFinanceStore((s) => s.creditRepayments);
  const insurancePolicies = useFinanceStore((s) => s.insurancePolicies);
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);

  return useMemo(() => {
    return credits
      .filter((c) => c.kind === 'mortgage' && c.currentValue != null)
      .map((c) => {
        // Проценты симулируются от даты выдачи (см. calculateMortgageProfit в CreditsScreen.tsx
        // для подробного объяснения) — так кредиту, взятому много лет назад, не нужно вручную
        // вносить каждый прошедший ежемесячный платёж, только досрочные погашения, если были.
        // Расчёт идёт в собственной валюте кредита, конвертация в валюту отображения — только
        // на финальных цифрах, отдаваемых наружу.
        const earlyRepaymentsForSimulation = creditRepayments
          .filter((r) => r.creditId === c.id && r.type !== 'regular')
          .map((r) => ({ date: r.date, amount: r.amount }));
        const totalInterestPaid = simulateAmortization(
          c.amount,
          c.rate,
          c.monthlyPayment,
          c.startDate,
          new Date(),
          earlyRepaymentsForSimulation
        ).totalInterestPaid;
        const totalInsuranceCost = insurancePolicies
          .filter((p) => p.creditId === c.id)
          .reduce((sum, p) => sum + p.amount, 0);
        const profit = calculateMortgageProfit(
          c.amount + (c.downPayment ?? 0),
          c.currentValue as number,
          c.remaining,
          totalInterestPaid,
          c.renovationCosts ?? 0,
          totalInsuranceCost
        );
        const toDisplay = (amount: number) => convertAmount(amount, c.currency, currency, rates);
        return {
          id: c.id,
          name: c.name,
          currentValue: toDisplay(c.currentValue as number),
          remaining: toDisplay(c.remaining),
          netProfit: toDisplay(profit.netProfit),
          netProfitPercent: profit.netProfitPercent,
          saleProceeds: toDisplay(profit.saleProceeds),
        };
      });
  }, [credits, creditRepayments, insurancePolicies, currency, rates]);
}
