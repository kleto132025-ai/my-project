import type { Currency } from '../types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

// Intl.NumberFormat('ru-RU', ...) would give the right result, but Hermes inside Expo Go
// doesn't reliably ship full ICU locale data — on-device this silently fell back to
// "350000.25" instead of "350 000,25". Building the string by hand guarantees the same
// output everywhere, independent of the JS engine's locale support.
export function formatNumber(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const isNegative = rounded < 0;
  const [intPart, fracPart = ''] = Math.abs(rounded).toFixed(2).split('.');
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const trimmedFrac = fracPart.replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${groupedInt}${trimmedFrac ? `,${trimmedFrac}` : ''}`;
}

export function formatCurrency(amount: number, currency: Currency = 'RUB'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${formatNumber(amount)} ${symbol}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
