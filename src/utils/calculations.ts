import type { Transaction } from '../types';

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount;
    if (t.type === 'expense') return sum - t.amount;
    return sum;
  }, 0);
}

export function calculateForecast(transactions: Transaction[], months: number): number {
  if (months <= 0) return calculateBalance(transactions);

  const now = new Date();
  const monthsSpan = new Map<string, number>();
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
    monthsSpan.set(key, (monthsSpan.get(key) ?? 0) + 1);
  }
  const distinctMonths = Math.max(monthsSpan.size, 1);

  const net = transactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount;
    if (t.type === 'expense') return sum - t.amount;
    return sum;
  }, 0);

  const avgMonthlyNet = net / distinctMonths;
  const currentBalance = calculateBalance(transactions);

  return currentBalance + avgMonthlyNet * months;
}

export function calculateLoanRemaining(
  amount: number,
  rate: number,
  paidMonths: number,
  termMonths = 24
): number {
  if (paidMonths <= 0) return amount;
  if (paidMonths >= termMonths) return 0;

  const monthlyRate = rate / 100 / 12;
  if (monthlyRate === 0) {
    return Math.max(Math.round(amount * (1 - paidMonths / termMonths) * 100) / 100, 0);
  }

  const growthFull = Math.pow(1 + monthlyRate, termMonths);
  const growthPaid = Math.pow(1 + monthlyRate, paidMonths);
  const remaining = (amount * (growthFull - growthPaid)) / (growthFull - 1);
  return Math.max(Math.round(remaining * 100) / 100, 0);
}

export function calculateGoalProgress(saved: number, target: number): number {
  if (target <= 0) return 0;
  const progress = (saved / target) * 100;
  return Math.min(Math.max(Math.round(progress), 0), 100);
}

export function calculateMonthlyPayment(amount: number, rate: number, termMonths: number): number {
  if (termMonths <= 0) return amount;
  const monthlyRate = rate / 100 / 12;
  if (monthlyRate === 0) return Math.round((amount / termMonths) * 100) / 100;
  const payment =
    (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

export function calculateTaxDeduction(amount: number, rate = 0.13): number {
  return Math.round(amount * rate * 100) / 100;
}
