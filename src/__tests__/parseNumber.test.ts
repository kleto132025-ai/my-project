import { parseLocaleNumber } from '../utils/parseNumber';

describe('parseLocaleNumber', () => {
  it('parses a plain integer', () => {
    expect(parseLocaleNumber('19')).toBe(19);
  });

  it('parses a dot-decimal number', () => {
    expect(parseLocaleNumber('19.9')).toBe(19.9);
  });

  it('parses a comma-decimal number (Russian locale keyboard)', () => {
    expect(parseLocaleNumber('19,9')).toBe(19.9);
  });

  it('trims surrounding whitespace', () => {
    expect(parseLocaleNumber('  19,9  ')).toBe(19.9);
  });

  it('returns NaN for empty input', () => {
    expect(Number.isNaN(parseLocaleNumber(''))).toBe(true);
  });
});
