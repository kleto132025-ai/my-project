import { detectDelimiter, parseCsv, parseCsvAmount, parseCsvDate } from '../utils/csv';

describe('detectDelimiter', () => {
  it('detects comma when it is more frequent', () => {
    expect(detectDelimiter('Date,Amount,Description')).toBe(',');
  });

  it('detects semicolon when it is more frequent (common for RU bank exports)', () => {
    expect(detectDelimiter('Дата;Сумма;Описание')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('parses a simple comma-delimited file into rows of fields', () => {
    const text = 'Date,Amount,Description\n2026-06-01,100.50,Coffee\n2026-06-02,-20,Bus';
    expect(parseCsv(text)).toEqual([
      ['Date', 'Amount', 'Description'],
      ['2026-06-01', '100.50', 'Coffee'],
      ['2026-06-02', '-20', 'Bus'],
    ]);
  });

  it('parses a semicolon-delimited file when auto-detected', () => {
    const text = 'Дата;Сумма;Описание\n01.06.2026;100,50;Кофе';
    expect(parseCsv(text)).toEqual([
      ['Дата', 'Сумма', 'Описание'],
      ['01.06.2026', '100,50', 'Кофе'],
    ]);
  });

  it('handles quoted fields containing the delimiter and embedded newlines', () => {
    const text = 'Date,Amount,Description\n2026-06-01,100,"Магазин, продукты"\n2026-06-02,50,"Two\nlines"';
    const rows = parseCsv(text);
    expect(rows[1]).toEqual(['2026-06-01', '100', 'Магазин, продукты']);
    expect(rows[2]).toEqual(['2026-06-02', '50', 'Two\nlines']);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const text = 'Description\n"Say ""hi"""';
    expect(parseCsv(text)).toEqual([['Description'], ['Say "hi"']]);
  });

  it('handles a file without a trailing newline', () => {
    const text = 'Date,Amount\n2026-06-01,100';
    expect(parseCsv(text)).toEqual([['Date', 'Amount'], ['2026-06-01', '100']]);
  });

  it('ignores a dangling blank line at the end of the file', () => {
    const text = 'Date,Amount\n2026-06-01,100\n';
    expect(parseCsv(text)).toEqual([['Date', 'Amount'], ['2026-06-01', '100']]);
  });
});

describe('parseCsvAmount', () => {
  it('parses a plain dot-decimal amount', () => {
    expect(parseCsvAmount('1234.56')).toBe(1234.56);
  });

  it('parses a plain comma-decimal amount', () => {
    expect(parseCsvAmount('1234,56')).toBe(1234.56);
  });

  it('parses a thousands-separated amount with a comma decimal (European style)', () => {
    expect(parseCsvAmount('1.234,56')).toBe(1234.56);
  });

  it('parses a thousands-separated amount with a dot decimal (US style)', () => {
    expect(parseCsvAmount('1,234.56')).toBe(1234.56);
  });

  it('parses a space-separated thousands amount', () => {
    expect(parseCsvAmount('1 234,56')).toBe(1234.56);
  });

  it('strips a currency symbol', () => {
    expect(parseCsvAmount('1234.56 ₽')).toBe(1234.56);
  });

  it('preserves a negative sign', () => {
    expect(parseCsvAmount('-500')).toBe(-500);
  });

  it('treats parenthesized amounts as negative', () => {
    expect(parseCsvAmount('(500)')).toBe(-500);
    expect(parseCsvAmount('(500,50)')).toBe(-500.5);
  });

  it('returns NaN for an empty or unparseable string', () => {
    expect(Number.isNaN(parseCsvAmount(''))).toBe(true);
    expect(Number.isNaN(parseCsvAmount('   '))).toBe(true);
  });
});

describe('parseCsvDate', () => {
  it('parses ISO format (YYYY-MM-DD)', () => {
    const d = parseCsvDate('2026-06-15');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });

  it('parses Russian bank format (DD.MM.YYYY)', () => {
    const d = parseCsvDate('15.06.2026');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });

  it('parses DD/MM/YYYY with slashes', () => {
    const d = parseCsvDate('05/03/2026');
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(5);
  });

  it('returns null for unparseable input', () => {
    expect(parseCsvDate('not a date')).toBeNull();
    expect(parseCsvDate('')).toBeNull();
  });
});
