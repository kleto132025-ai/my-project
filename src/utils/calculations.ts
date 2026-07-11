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

  // Прогноз строится не по последнему месяцу, а по среднему чистому потоку (доходы минус расходы)
  // за все месяцы, где были операции — так один аномально большой платёж не искажает прогноз.
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

// termMonths — необязательный параметр сверх сигнатуры из ТЗ (amount, rate, paidMonths).
// Без общего срока кредита формула аннуитета математически вырождается в исходную сумму
// (числитель и знаменатель сокращаются), поэтому термин нужен по умолчанию.
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

  // Классическая формула остатка аннуитетного кредита:
  // остаток = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1], где n — общий срок, p — оплаченные месяцы.
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
  // Стандартная формула аннуитетного платежа.
  const payment =
    (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

export function calculateTaxDeduction(amount: number, rate = 0.13): number {
  return Math.round(amount * rate * 100) / 100;
}

export interface AmortizationStep {
  interestPortion: number;
  principalPortion: number;
  newRemaining: number;
}

// Разбивает регулярный платёж на проценты и погашение основного долга (стандартная схема
// аннуитета): сначала списываются проценты, начисленные на текущий остаток, оставшаяся часть
// платежа уменьшает сам долг. Без этого шага "остаток" по кредиту никогда не двигался бы от
// обычных ежемесячных платежей — только от досрочных погашений, что и давало неверные суммы.
export function calculateAmortizationStep(
  remaining: number,
  rate: number,
  paymentAmount: number
): AmortizationStep {
  const monthlyRate = rate / 100 / 12;
  const interestPortion = Math.round(remaining * monthlyRate * 100) / 100;
  const principalPortion = Math.max(Math.min(paymentAmount - interestPortion, remaining), 0);
  const newRemaining = Math.max(Math.round((remaining - principalPortion) * 100) / 100, 0);
  return { interestPortion, principalPortion, newRemaining };
}
