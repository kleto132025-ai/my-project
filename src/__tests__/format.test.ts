import { formatCurrency, formatPercent } from '../utils/format';

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
});

describe('formatPercent', () => {
  it('rounds and appends %', () => {
    expect(formatPercent(33.6)).toBe('34%');
  });
});
