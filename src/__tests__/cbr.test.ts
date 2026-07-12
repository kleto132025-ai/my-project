import { extractCbrRate, fetchCbrRate, CbrApiError } from '../utils/cbr';

const SAMPLE_XML = `<?xml version="1.0" encoding="windows-1251"?>
<ValCurs Date="12.07.2026" name="Foreign Currency Market">
<Valute ID="R01235">
<NumCode>840</NumCode>
<CharCode>USD</CharCode>
<Nominal>1</Nominal>
<Value>91,2345</Value>
</Valute>
<Valute ID="R01239">
<NumCode>978</NumCode>
<CharCode>EUR</CharCode>
<Nominal>1</Nominal>
<Value>98,5678</Value>
</Valute>
<Valute ID="R01820">
<NumCode>392</NumCode>
<CharCode>JPY</CharCode>
<Nominal>100</Nominal>
<Value>60,1234</Value>
</Valute>
</ValCurs>`;

describe('extractCbrRate', () => {
  it('extracts the USD rate', () => {
    expect(extractCbrRate(SAMPLE_XML, 'USD')).toBe(91.2345);
  });

  it('extracts the EUR rate', () => {
    expect(extractCbrRate(SAMPLE_XML, 'EUR')).toBe(98.5678);
  });

  it('divides by Nominal when a currency is quoted per 100 units (not USD/EUR here, but exercises the same code path)', () => {
    const xml = `<Valute><CharCode>USD</CharCode><Nominal>100</Nominal><Value>9123,45</Value></Valute>`;
    expect(extractCbrRate(xml, 'USD')).toBe(91.2345);
  });

  it('returns null when the currency is not present', () => {
    expect(extractCbrRate(SAMPLE_XML, 'EUR' as 'EUR')).not.toBeNull();
    const xmlWithoutEur = SAMPLE_XML.replace(/<Valute ID="R01239">[\s\S]*?<\/Valute>\n/, '');
    expect(extractCbrRate(xmlWithoutEur, 'EUR')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(extractCbrRate('not xml at all', 'USD')).toBeNull();
    expect(extractCbrRate('', 'EUR')).toBeNull();
  });
});

describe('fetchCbrRate', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the parsed rate on success', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: true, text: async () => SAMPLE_XML })) as unknown as typeof fetch;
    await expect(fetchCbrRate('USD')).resolves.toBe(91.2345);
  });

  it('throws a friendly error on a network failure', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(fetchCbrRate('USD')).rejects.toThrow(CbrApiError);
  });

  it('throws when the HTTP response is not ok', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(fetchCbrRate('USD')).rejects.toThrow(CbrApiError);
  });

  it('throws when the response has no parseable rate', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: true, text: async () => '<ValCurs></ValCurs>' })) as unknown as typeof fetch;
    await expect(fetchCbrRate('EUR')).rejects.toThrow(CbrApiError);
  });
});
