import { formatCurrency, formatNumber, formatPercent } from '../utils/format';

describe('formatCurrency', () => {
  it('formats RUB with ruble sign by default', () => {
    expect(formatCurrency(1000)).toBe('1 000 ₽');
  });

  it('formats USD with dollar sign', () => {
    expect(formatCurrency(50, 'USD')).toBe('50 $');
  });

  it('formats EUR with euro sign', () => {
    expect(formatCurrency(50, 'EUR')).toBe('50 €');
  });

  it('groups thousands with a space and uses a comma for decimals', () => {
    expect(formatCurrency(350000.25)).toBe('350 000,25 ₽');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-4500)).toBe('-4 500 ₽');
  });
});

describe('formatNumber', () => {
  it('groups thousands and uses a comma for decimals', () => {
    expect(formatNumber(350000.25)).toBe('350 000,25');
  });

  it('trims trailing zeros in the fraction', () => {
    expect(formatNumber(100.1)).toBe('100,1');
    expect(formatNumber(1000000)).toBe('1 000 000');
  });

  it('keeps two decimal digits when both are significant', () => {
    expect(formatNumber(19.9)).toBe('19,9');
    expect(formatNumber(19.95)).toBe('19,95');
  });
});

describe('formatPercent', () => {
  it('rounds and appends %', () => {
    expect(formatPercent(33.6)).toBe('34%');
  });
});
