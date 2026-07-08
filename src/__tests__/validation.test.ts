import { validateTransaction, isDuplicateTransaction } from '../utils/validation';
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

describe('validateTransaction', () => {
  it('accepts a well-formed transaction', () => {
    expect(validateTransaction(makeTransaction({}))).toBe(true);
  });

  it('rejects zero or negative amount', () => {
    expect(validateTransaction(makeTransaction({ amount: 0 }))).toBe(false);
    expect(validateTransaction(makeTransaction({ amount: -5 }))).toBe(false);
  });

  it('rejects empty category', () => {
    expect(validateTransaction(makeTransaction({ category: '' }))).toBe(false);
  });

  it('rejects invalid type', () => {
    expect(validateTransaction({ ...makeTransaction({}), type: 'bad' as any })).toBe(false);
  });

  it('rejects invalid date', () => {
    expect(validateTransaction(makeTransaction({ date: new Date('invalid') }))).toBe(false);
  });
});

describe('isDuplicateTransaction', () => {
  it('detects a duplicate within 1 minute with same fields', () => {
    const existing = [makeTransaction({ date: new Date('2026-06-01T10:00:00') })];
    const candidate = makeTransaction({ date: new Date('2026-06-01T10:00:30') });
    expect(isDuplicateTransaction(candidate, existing)).toBe(true);
  });

  it('does not flag distinct transactions as duplicates', () => {
    const existing = [makeTransaction({ amount: 200 })];
    const candidate = makeTransaction({ amount: 100 });
    expect(isDuplicateTransaction(candidate, existing)).toBe(false);
  });
});
