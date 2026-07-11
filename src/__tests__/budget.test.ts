import { calculateSpentForLimit, getCalendarPeriodRange } from '../utils/budget';
import type { BudgetLimit, Transaction } from '../types';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: '1',
    amount: 100,
    category: 'Продукты',
    type: 'expense',
    date: new Date(),
    currency: 'RUB',
    ...overrides,
  };
}

function makeLimit(overrides: Partial<BudgetLimit>): BudgetLimit {
  return { id: '1', category: 'Продукты', limit: 30000, spent: 0, period: 'month', ...overrides };
}

describe('getCalendarPeriodRange', () => {
  it('starts a month period on the 1st of the current month', () => {
    const now = new Date(2026, 5, 15); // 15 June 2026
    const { start, end } = getCalendarPeriodRange('month', now);
    expect(start).toEqual(new Date(2026, 5, 1));
    expect(end).toBe(now);
  });

  it('starts a quarter period on the first month of the quarter', () => {
    const now = new Date(2026, 5, 15); // June -> Q2 starts in April
    const { start } = getCalendarPeriodRange('quarter', now);
    expect(start).toEqual(new Date(2026, 3, 1));
  });
});

describe('calculateSpentForLimit', () => {
  it('sums only expenses in the matching category within the current month', () => {
    const now = new Date(2026, 5, 15);
    const transactions = [
      makeTransaction({ amount: 1000, category: 'Продукты', date: new Date(2026, 5, 10) }),
      makeTransaction({ amount: 500, category: 'Продукты', date: new Date(2026, 4, 20) }), // last month
      makeTransaction({ amount: 300, category: 'Рестораны', date: new Date(2026, 5, 10) }),
      makeTransaction({ amount: 200, category: 'Продукты', type: 'income', date: new Date(2026, 5, 10) }),
    ];
    const limit = makeLimit({ category: 'Продукты' });
    jest.useFakeTimers().setSystemTime(now);
    expect(calculateSpentForLimit(transactions, limit)).toBe(1000);
    jest.useRealTimers();
  });

  it('sums all expense categories for the general "Общий лимит" limit', () => {
    const now = new Date(2026, 5, 15);
    const transactions = [
      makeTransaction({ amount: 1000, category: 'Продукты', date: new Date(2026, 5, 10) }),
      makeTransaction({ amount: 300, category: 'Рестораны', date: new Date(2026, 5, 10) }),
    ];
    const limit = makeLimit({ category: 'Общий лимит' });
    jest.useFakeTimers().setSystemTime(now);
    expect(calculateSpentForLimit(transactions, limit)).toBe(1300);
    jest.useRealTimers();
  });
});
