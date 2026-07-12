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

// Проценты по накопительному счёту, начисляемые на остаток за один календарный месяц.
export function calculateMonthlyInterest(balance: number, annualRatePercent: number): number {
  return Math.round(balance * (annualRatePercent / 100 / 12) * 100) / 100;
}

// Сколько полных календарных месяцев прошло между двумя датами (по году/месяцу, без учёта
// дня) — используется, чтобы понять, за сколько месяцев ещё не начислены проценты по счёту.
export function monthsElapsed(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(months, 0);
}

export interface MortgageProfit {
  /** currentValue − (тело кредита + первый взнос) − проценты − ремонт − страховка. */
  netProfit: number;
  /** netProfit относительно того, сколько было заплачено за объект изначально, в %. */
  netProfitPercent: number;
  /** currentValue − остаток долга: сколько денег останется на руках при продаже сегодня. */
  saleProceeds: number;
}

// Общая формула чистой прибыли/актива по объекту ипотеки, используется и на карточке
// кредита, и в сводке на главном экране — вынесена в одно место, чтобы не разойтись.
// Тело кредита (погашённая часть) в расход не идёт: деньги не потрачены, а превратились
// в капитал — это уже отражено в разнице между currentValue и остатком долга.
export function calculateMortgageProfit(
  purchasePrice: number,
  currentValue: number,
  remaining: number,
  totalInterestPaid: number,
  renovationCosts: number,
  totalInsuranceCost: number
): MortgageProfit {
  const netProfit = currentValue - purchasePrice - totalInterestPaid - renovationCosts - totalInsuranceCost;
  const netProfitPercent = purchasePrice > 0 ? Math.round((netProfit / purchasePrice) * 1000) / 10 : 0;
  const saleProceeds = currentValue - remaining;
  return { netProfit, netProfitPercent, saleProceeds };
}

// Ближайшая дата с указанным числом месяца, не раньше `from` (включительно): если это число
// уже прошло в текущем месяце — берётся следующий месяц. Используется для регулярных платежей
// и ежемесячных страховых взносов, у которых хранится только "число месяца", а не точная дата.
// Если dayOfMonth больше, чем дней в конкретном месяце (например, 31), Date сам перетекает
// в начало следующего месяца — это осознанно принятое упрощение, а не отдельно обрабатывается.
export function nextMonthlyOccurrence(dayOfMonth: number, from: Date): Date {
  const candidate = new Date(from.getFullYear(), from.getMonth(), dayOfMonth);
  if (candidate.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
}

export interface AmortizationSimulation {
  remaining: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
}

// Симулирует помесячные платежи от даты выдачи кредита до сегодняшнего дня по фиксированной
// сумме платежа и ставке, накладывая уже зафиксированные досрочные погашения в их даты.
// Нужна для того, чтобы посчитать сумму выплаченных процентов "на сегодня" у кредита,
// взятого много лет назад, без необходимости вручную вносить каждый прошедший ежемесячный
// платёж — по факту берётся дата выдачи, ставка, сумма платежа и список досрочных погашений.
export function simulateAmortization(
  amount: number,
  rate: number,
  monthlyPayment: number,
  startDate: Date,
  asOfDate: Date,
  earlyRepayments: { date: Date; amount: number }[]
): AmortizationSimulation {
  let balance = amount;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  const sortedEarly = [...earlyRepayments].sort((a, b) => a.date.getTime() - b.date.getTime());
  let earlyIndex = 0;
  const applyDueEarlyRepayments = (upTo: Date) => {
    while (balance > 0 && earlyIndex < sortedEarly.length && sortedEarly[earlyIndex].date.getTime() <= upTo.getTime()) {
      const extra = Math.min(sortedEarly[earlyIndex].amount, balance);
      balance = Math.max(Math.round((balance - extra) * 100) / 100, 0);
      totalPrincipalPaid += extra;
      earlyIndex++;
    }
  };

  const cursor = new Date(startDate);
  while (balance > 0) {
    cursor.setMonth(cursor.getMonth() + 1);
    if (cursor.getTime() > asOfDate.getTime()) break;
    applyDueEarlyRepayments(cursor);
    if (balance <= 0) break;
    const step = calculateAmortizationStep(balance, rate, monthlyPayment);
    totalInterestPaid += step.interestPortion;
    totalPrincipalPaid += step.principalPortion;
    balance = step.newRemaining;
  }
  applyDueEarlyRepayments(asOfDate);

  return {
    remaining: balance,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
  };
}
