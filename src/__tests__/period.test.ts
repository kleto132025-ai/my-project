import { filterTransactionsByPeriod } from '../utils/period';
import type { Transaction } from '../types';

function makeTransaction(id: string, date: string): Transaction {
  return { id, amount: 100, category: 'Продукты', type: 'expense', date: new Date(date), currency: 'RUB' };
}

const NOW = new Date('2026-06-15T12:00:00');

describe('filterTransactionsByPeriod', () => {
  const transactions = [
    makeTransaction('t1', '2026-06-01'), // this month
    makeTransaction('t2', '2026-06-30'), // this month
    makeTransaction('t3', '2026-05-15'), // last month
    makeTransaction('t4', '2026-01-01'), // this year, earlier month
    makeTransaction('t5', '2025-12-31'), // last year
  ];

  it('returns everything unfiltered for "all"', () => {
    expect(filterTransactionsByPeriod(transactions, 'all', NOW)).toHaveLength(5);
  });

  it('keeps only transactions within the current calendar month', () => {
    const result = filterTransactionsByPeriod(transactions, 'this_month', NOW);
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('keeps only transactions within the previous calendar month', () => {
    const result = filterTransactionsByPeriod(transactions, 'last_month', NOW);
    expect(result.map((t) => t.id)).toEqual(['t3']);
  });

  it('keeps only transactions within the current calendar year', () => {
    const result = filterTransactionsByPeriod(transactions, 'this_year', NOW);
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('excludes a transaction dated exactly at the start of next month', () => {
    const boundary = [makeTransaction('edge', '2026-07-01T00:00:00')];
    expect(filterTransactionsByPeriod(boundary, 'this_month', NOW)).toHaveLength(0);
  });
});
