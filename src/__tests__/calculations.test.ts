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
