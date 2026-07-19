import {
  calculateBalance,
  calculateForecast,
  calculateLoanRemaining,
  calculateGoalProgress,
  calculateMonthlyPayment,
  calculateTaxDeduction,
  calculateAmortizationStep,
  calculateMonthlyInterest,
  monthsElapsed,
  calculateMortgageProfit,
  simulateAmortization,
  nextMonthlyOccurrence,
  nextRegularPaymentOccurrence,
  buildSavingsPlan,
} from '../utils/calculations';
import type { Transaction } from '../types';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: '1',
    amount: 100,
    category: 'Продукты',
    type: 'expense',
    date: new Date('2026-06-01'),
    currency: 'RUB',
    ...overrides,
  };
}

describe('calculateBalance', () => {
  it('sums incomes and subtracts expenses', () => {
    const transactions = [
      makeTransaction({ type: 'income', amount: 1000 }),
      makeTransaction({ type: 'expense', amount: 300 }),
      makeTransaction({ type: 'transfer', amount: 50 }),
    ];
    expect(calculateBalance(transactions)).toBe(700);
  });

  it('returns 0 for empty list', () => {
    expect(calculateBalance([])).toBe(0);
  });
});

describe('calculateForecast', () => {
  it('returns current balance when months is 0', () => {
    const transactions = [makeTransaction({ type: 'income', amount: 500 })];
    expect(calculateForecast(transactions, 0)).toBe(500);
  });

  it('projects balance forward using average monthly net', () => {
    const transactions = [
      makeTransaction({ type: 'income', amount: 1000, date: new Date('2026-05-01') }),
      makeTransaction({ type: 'expense', amount: 400, date: new Date('2026-05-15') }),
    ];
    // single month of data: net = 600, avg monthly net = 600
    expect(calculateForecast(transactions, 2)).toBe(600 + 600 * 2);
  });
});

describe('calculateLoanRemaining', () => {
  it('returns full amount when no months paid', () => {
    expect(calculateLoanRemaining(300000, 15, 0, 24)).toBe(300000);
  });

  it('decreases remaining balance as months are paid', () => {
    const remaining = calculateLoanRemaining(300000, 15, 12, 24);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(300000);
  });

  it('reaches zero once the term is fully paid', () => {
    expect(calculateLoanRemaining(300000, 15, 24, 24)).toBe(0);
  });
});

describe('calculateMonthlyPayment', () => {
  it('divides evenly when rate is 0', () => {
    expect(calculateMonthlyPayment(1200, 0, 12)).toBe(100);
  });

  it('computes annuity payment for positive rate', () => {
    const payment = calculateMonthlyPayment(300000, 15, 24);
    expect(payment).toBeGreaterThan(300000 / 24);
  });
});

describe('calculateGoalProgress', () => {
  it('computes percentage, clamped between 0 and 100', () => {
    expect(calculateGoalProgress(30000, 100000)).toBe(30);
    expect(calculateGoalProgress(150000, 100000)).toBe(100);
    expect(calculateGoalProgress(-10, 100000)).toBe(0);
    expect(calculateGoalProgress(50, 0)).toBe(0);
  });
});

describe('calculateTaxDeduction', () => {
  it('applies default 13% rate', () => {
    expect(calculateTaxDeduction(100000)).toBe(13000);
  });
});

describe('calculateAmortizationStep', () => {
  it('splits a regular payment into interest and principal', () => {
    // 300000 at 15% annual -> 3750 monthly interest on the full balance.
    const step = calculateAmortizationStep(300000, 15, 14545.99);
    expect(step.interestPortion).toBe(3750);
    expect(step.principalPortion).toBeCloseTo(14545.99 - 3750, 2);
    expect(step.newRemaining).toBeCloseTo(300000 - (14545.99 - 3750), 2);
  });

  it('never reduces principal below the outstanding balance', () => {
    const step = calculateAmortizationStep(1000, 15, 1_000_000);
    expect(step.newRemaining).toBe(0);
    expect(step.principalPortion).toBe(1000);
  });

  it('does not let principal go negative when the payment does not cover interest', () => {
    const step = calculateAmortizationStep(300000, 15, 100);
    expect(step.principalPortion).toBe(0);
    expect(step.newRemaining).toBe(300000);
  });

  it('treats a zero rate as pure principal repayment', () => {
    const step = calculateAmortizationStep(1000, 0, 400);
    expect(step.interestPortion).toBe(0);
    expect(step.principalPortion).toBe(400);
    expect(step.newRemaining).toBe(600);
  });
});

describe('calculateMonthlyInterest', () => {
  it('computes one month of interest on the balance', () => {
    expect(calculateMonthlyInterest(120000, 12)).toBe(1200);
  });

  it('returns 0 for a zero balance or zero rate', () => {
    expect(calculateMonthlyInterest(0, 10)).toBe(0);
    expect(calculateMonthlyInterest(1000, 0)).toBe(0);
  });
});

describe('monthsElapsed', () => {
  it('counts full calendar months between two dates', () => {
    expect(monthsElapsed(new Date('2026-01-15'), new Date('2026-04-10'))).toBe(3);
  });

  it('returns 0 within the same month', () => {
    expect(monthsElapsed(new Date('2026-06-01'), new Date('2026-06-28'))).toBe(0);
  });

  it('never returns a negative number', () => {
    expect(monthsElapsed(new Date('2026-06-01'), new Date('2026-01-01'))).toBe(0);
  });
});

describe('calculateMortgageProfit', () => {
  it('computes net profit and percent gain relative to purchase price', () => {
    // Куплено за 5 000 000 (4 000 000 кредит + 1 000 000 взнос), сейчас стоит 6 000 000,
    // выплачено 300 000 процентов, 200 000 на ремонт, 50 000 страховки за всё время.
    const result = calculateMortgageProfit(5_000_000, 6_000_000, 3_500_000, 300_000, 200_000, 50_000);
    expect(result.netProfit).toBe(450_000);
    expect(result.netProfitPercent).toBe(9);
    expect(result.saleProceeds).toBe(2_500_000);
  });

  it('returns a negative net profit when costs exceed appreciation', () => {
    const result = calculateMortgageProfit(5_000_000, 5_100_000, 4_500_000, 400_000, 100_000, 60_000);
    expect(result.netProfit).toBeLessThan(0);
  });

  it('handles a zero purchase price without dividing by zero', () => {
    const result = calculateMortgageProfit(0, 100, 0, 0, 0, 0);
    expect(result.netProfitPercent).toBe(0);
  });
});

describe('simulateAmortization', () => {
  it('matches calculateLoanRemaining when there are no early repayments', () => {
    const amount = 300000;
    const rate = 15;
    const termMonths = 24;
    const monthlyPayment = calculateMonthlyPayment(amount, rate, termMonths);
    const startDate = new Date('2024-01-01');
    const asOfDate = new Date('2025-01-01'); // ровно 12 месяцев спустя

    const result = simulateAmortization(amount, rate, monthlyPayment, startDate, asOfDate, []);
    const expectedRemaining = calculateLoanRemaining(amount, rate, 12, termMonths);
    expect(result.remaining).toBeCloseTo(expectedRemaining, 0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
  });

  it('returns zero interest and full amount when nothing has elapsed yet', () => {
    const startDate = new Date('2026-01-01');
    const result = simulateAmortization(300000, 15, 14545.99, startDate, startDate, []);
    expect(result.remaining).toBe(300000);
    expect(result.totalInterestPaid).toBe(0);
  });

  it('applies an early repayment on top of the regular schedule, reducing remaining balance', () => {
    const amount = 300000;
    const rate = 15;
    const monthlyPayment = calculateMonthlyPayment(amount, rate, 24);
    const startDate = new Date('2024-01-01');
    const asOfDate = new Date('2025-01-01');

    const withoutEarly = simulateAmortization(amount, rate, monthlyPayment, startDate, asOfDate, []);
    const withEarly = simulateAmortization(amount, rate, monthlyPayment, startDate, asOfDate, [
      { date: new Date('2024-06-15'), amount: 50000 },
    ]);
    expect(withEarly.remaining).toBeLessThan(withoutEarly.remaining);
    expect(withEarly.totalInterestPaid).toBeLessThan(withoutEarly.totalInterestPaid);
  });

  it('never lets the balance go negative when an early repayment exceeds it', () => {
    const startDate = new Date('2026-01-01');
    const asOfDate = new Date('2026-03-01');
    const result = simulateAmortization(1000, 12, 500, startDate, asOfDate, [
      { date: new Date('2026-01-15'), amount: 1_000_000 },
    ]);
    expect(result.remaining).toBe(0);
  });
});

describe('nextMonthlyOccurrence', () => {
  it('returns this month\'s date when the day has not passed yet', () => {
    const from = new Date('2026-06-10');
    const result = nextMonthlyOccurrence(20, from);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(20);
  });

  it('rolls over to next month when the day has already passed', () => {
    const from = new Date('2026-06-25');
    const result = nextMonthlyOccurrence(20, from);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(20);
  });

  it('treats the day itself as not yet passed (inclusive)', () => {
    const from = new Date('2026-06-20');
    const result = nextMonthlyOccurrence(20, from);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(20);
  });
});

describe('nextRegularPaymentOccurrence', () => {
  it('falls back to nextMonthlyOccurrence when there is no window', () => {
    const from = new Date('2026-06-25');
    const result = nextRegularPaymentOccurrence(20, undefined, from);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(20);
  });

  it('returns today when today falls inside an already-open payment window (e.g. ЖКХ 1-10)', () => {
    // Regression: nextMonthlyOccurrence(1, ...) would roll this to next month even though
    // the window (1-10) is still open today, making it vanish from "На этой неделе".
    const from = new Date('2026-06-05');
    const result = nextRegularPaymentOccurrence(1, 10, from);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(5);
  });

  it('returns the window start when the window has not opened yet this month', () => {
    const from = new Date('2026-06-05');
    const result = nextRegularPaymentOccurrence(10, 20, from);
    expect(result.getDate()).toBe(10);
  });

  it('rolls over to next month once the window has fully closed', () => {
    const from = new Date('2026-06-15');
    const result = nextRegularPaymentOccurrence(1, 10, from);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(1);
  });

  it('treats the last day of the window as still open (inclusive)', () => {
    const from = new Date('2026-06-10');
    const result = nextRegularPaymentOccurrence(1, 10, from);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(10);
  });
});

describe('buildSavingsPlan', () => {
  const discretionary = ['Развлечения', 'Рестораны'];
  const transfers = ['Перевод на счёт', 'Перевод со счёта'];

  it('computes average monthly income/expense and the 10-30% target range', () => {
    const transactions = [
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-06-05') }),
      makeTransaction({ type: 'expense', category: 'Продукты', amount: 30000, date: new Date('2026-06-10') }),
      makeTransaction({ type: 'expense', category: 'Рестораны', amount: 10000, date: new Date('2026-06-15') }),
    ];
    const plan = buildSavingsPlan(transactions, discretionary, transfers);

    expect(plan.avgMonthlyIncome).toBe(100000);
    expect(plan.avgMonthlyExpense).toBe(40000);
    expect(plan.currentMonthlySavings).toBe(60000);
    expect(plan.currentSavingsRate).toBe(60);
    expect(plan.targetLow).toBe(10000);
    expect(plan.targetHigh).toBe(30000);
    expect(plan.shortfallToTargetLow).toBe(0);
  });

  it('excludes transfer categories from income/expense so they do not distort the savings rate', () => {
    const transactions = [
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-06-05') }),
      makeTransaction({ type: 'expense', category: 'Перевод на счёт', amount: 50000, date: new Date('2026-06-06') }),
      makeTransaction({ type: 'expense', category: 'Продукты', amount: 20000, date: new Date('2026-06-10') }),
    ];
    const plan = buildSavingsPlan(transactions, discretionary, transfers);

    expect(plan.avgMonthlyIncome).toBe(100000);
    expect(plan.avgMonthlyExpense).toBe(20000);
  });

  it('lists discretionary categories sorted by monthly average, excluding non-discretionary ones', () => {
    const transactions = [
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-06-05') }),
      makeTransaction({ type: 'expense', category: 'Продукты', amount: 20000, date: new Date('2026-06-10') }),
      makeTransaction({ type: 'expense', category: 'Рестораны', amount: 8000, date: new Date('2026-06-12') }),
      makeTransaction({ type: 'expense', category: 'Развлечения', amount: 12000, date: new Date('2026-06-14') }),
    ];
    const plan = buildSavingsPlan(transactions, discretionary, transfers);

    expect(plan.discretionary).toEqual([
      { category: 'Развлечения', monthlyAvg: 12000 },
      { category: 'Рестораны', monthlyAvg: 8000 },
    ]);
    expect(plan.discretionaryMonthlyTotal).toBe(20000);
  });

  it('reports a shortfall to the 10% target when currently saving less', () => {
    const transactions = [
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-06-05') }),
      makeTransaction({ type: 'expense', category: 'Продукты', amount: 98000, date: new Date('2026-06-10') }),
    ];
    const plan = buildSavingsPlan(transactions, discretionary, transfers);

    // saving 2000/mo, target low is 10000 -> shortfall 8000
    expect(plan.currentMonthlySavings).toBe(2000);
    expect(plan.shortfallToTargetLow).toBe(8000);
  });

  it('averages over the number of distinct months with any activity', () => {
    const transactions = [
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-05-05') }),
      makeTransaction({ type: 'income', category: 'Зарплата', amount: 100000, date: new Date('2026-06-05') }),
    ];
    const plan = buildSavingsPlan(transactions, discretionary, transfers);
    expect(plan.avgMonthlyIncome).toBe(100000);
  });

  it('handles zero income without dividing by zero', () => {
    const plan = buildSavingsPlan([], discretionary, transfers);
    expect(plan.currentSavingsRate).toBe(0);
    expect(plan.targetLow).toBe(0);
    expect(plan.targetHigh).toBe(0);
  });
});
