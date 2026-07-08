import type { Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

// Intl inserts non-breaking / narrow no-break spaces as group separators; normalize to a plain space.
const NON_STANDARD_SPACES = /[  ]/g;

export function formatCurrency(amount: number, currency: Currency = 'RUB'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace(NON_STANDARD_SPACES, ' ');
  return `${formatted} ${symbol}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
