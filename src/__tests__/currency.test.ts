import { convertAmount, normalizeTransactionsToCurrency } from '../utils/currency';
import type { Transaction } from '../types';

const RATES = { RUB: 1, USD: 90, EUR: 98 };

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

describe('convertAmount', () => {
  it('returns the same amount when currencies match', () => {
    expect(convertAmount(100, 'RUB', 'RUB', RATES)).toBe(100);
  });

  it('converts through RUB as the common denominator', () => {
    expect(convertAmount(10, 'USD', 'RUB', RATES)).toBe(900);
  });

  it('converts between two non-RUB currencies', () => {
    const result = convertAmount(98, 'EUR', 'USD', RATES);
    expect(result).toBeCloseTo(98 * 98 / 90, 5);
  });
});

describe('normalizeTransactionsToCurrency', () => {
  it('leaves transactions already in the target currency untouched', () => {
    const transactions = [makeTransaction({ currency: 'RUB', amount: 500 })];
    const normalized = normalizeTransactionsToCurrency(transactions, 'RUB', RATES);
    expect(normalized[0]).toBe(transactions[0]);
  });

  it('converts amount and currency for mismatched transactions', () => {
    const transactions = [makeTransaction({ currency: 'USD', amount: 10 })];
    const normalized = normalizeTransactionsToCurrency(transactions, 'RUB', RATES);
    expect(normalized[0].amount).toBe(900);
    expect(normalized[0].currency).toBe('RUB');
  });
});
