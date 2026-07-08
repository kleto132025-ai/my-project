import type { Transaction } from '../types';

export function validateTransaction(transaction: Partial<Transaction>): boolean {
  if (typeof transaction.amount !== 'number' || Number.isNaN(transaction.amount)) return false;
  if (transaction.amount <= 0) return false;
  if (!transaction.category || transaction.category.trim().length === 0) return false;
  if (transaction.type !== 'income' && transaction.type !== 'expense' && transaction.type !== 'transfer') {
    return false;
  }
  if (!transaction.date || !(transaction.date instanceof Date) || Number.isNaN(transaction.date.getTime())) {
    return false;
  }
  if (!transaction.currency) return false;
  return true;
}

export function isDuplicateTransaction(candidate: Transaction, existing: Transaction[]): boolean {
  return existing.some(
    (t) =>
      t.amount === candidate.amount &&
      t.category === candidate.category &&
      t.type === candidate.type &&
      Math.abs(t.date.getTime() - candidate.date.getTime()) < 60_000 &&
      (t.comment ?? '') === (candidate.comment ?? '')
  );
}
