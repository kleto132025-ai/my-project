import { extractLastPrice, fetchMoexPrice, MoexApiError, extractSecuritySearchResults, searchMoexSecurities } from '../utils/moex';

describe('extractLastPrice', () => {
  it('returns the LAST price from the first marketdata row that has one', () => {
    const data = {
      marketdata: { columns: ['BOARDID', 'LAST'], data: [['TQBR', 285.5]] },
      securities: { columns: ['BOARDID', 'PREVPRICE'], data: [['TQBR', 280.1]] },
    };
    expect(extractLastPrice(data)).toBe(285.5);
  });

  it('skips marketdata rows with a null LAST (e.g. a closed alternate trading mode) and picks the next one', () => {
    const data = {
      marketdata: {
        columns: ['BOARDID', 'LAST'],
        data: [
          ['SMAL', null],
          ['TQBR', 100.2],
        ],
      },
    };
    expect(extractLastPrice(data)).toBe(100.2);
  });

  it('falls back to securities.PREVPRICE when no marketdata row has a LAST (market closed)', () => {
    const data = {
      marketdata: { columns: ['BOARDID', 'LAST'], data: [['TQBR', null]] },
      securities: { columns: ['BOARDID', 'PREVPRICE'], data: [['TQBR', 99.9]] },
    };
    expect(extractLastPrice(data)).toBe(99.9);
  });

  it('returns null when neither block has a usable price', () => {
    const data = {
      marketdata: { columns: ['BOARDID', 'LAST'], data: [['TQBR', null]] },
      securities: { columns: ['BOARDID', 'PREVPRICE'], data: [['TQBR', null]] },
    };
    expect(extractLastPrice(data)).toBeNull();
  });

  it('returns null for malformed or missing input instead of throwing', () => {
    expect(extractLastPrice(null)).toBeNull();
    expect(extractLastPrice({})).toBeNull();
    expect(extractLastPrice(undefined)).toBeNull();
  });
});

type FetchMock = jest.Mock<Promise<{ ok: boolean; status?: number; json?: () => Promise<unknown> }>, [string]>;

describe('fetchMoexPrice', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rejects immediately for crypto without making a network request', async () => {
    const fetchMock: FetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchMoexPrice('BTC', 'crypto')).rejects.toThrow(MoexApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the shares market for stocks and funds, and the bonds market for bonds', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ marketdata: { columns: ['LAST'], data: [[123.4]] } }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchMoexPrice('SBER', 'stock');
    expect(fetchMock.mock.calls[0][0]).toContain('/markets/shares/');

    await fetchMoexPrice('SU26238RMFS4', 'bond');
    expect(fetchMock.mock.calls[1][0]).toContain('/markets/bonds/');
  });

  it('uppercases and trims the ticker in the request URL', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ marketdata: { columns: ['LAST'], data: [[1]] } }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchMoexPrice('  sber  ', 'stock');
    expect(fetchMock.mock.calls[0][0]).toContain('/securities/SBER.json');
  });

  it('throws a friendly error on a network failure', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => {
      throw new Error('offline');
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchMoexPrice('SBER', 'stock')).rejects.toThrow(MoexApiError);
  });

  it('throws when the HTTP response is not ok', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => ({ ok: false, status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchMoexPrice('SBER', 'stock')).rejects.toThrow(MoexApiError);
  });

  it('throws when the ticker has no resolvable price', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ marketdata: { columns: ['LAST'], data: [] } }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchMoexPrice('UNKNOWN', 'stock')).rejects.toThrow(MoexApiError);
  });
});

describe('extractSecuritySearchResults', () => {
  it('returns secid/shortname pairs for traded securities', () => {
    const data = {
      securities: {
        columns: ['secid', 'shortname', 'is_traded'],
        data: [
          ['SBER', 'Сбербанк', 1],
          ['X5', 'X5 Group', 1],
        ],
      },
    };
    expect(extractSecuritySearchResults(data)).toEqual([
      { secid: 'SBER', shortname: 'Сбербанк' },
      { secid: 'X5', shortname: 'X5 Group' },
    ]);
  });

  it('filters out securities that are not currently traded', () => {
    const data = {
      securities: {
        columns: ['secid', 'shortname', 'is_traded'],
        data: [
          ['OLD1', 'Делистингованная бумага', 0],
          ['SBER', 'Сбербанк', 1],
        ],
      },
    };
    expect(extractSecuritySearchResults(data)).toEqual([{ secid: 'SBER', shortname: 'Сбербанк' }]);
  });

  it('deduplicates repeated secid rows (e.g. multiple bond issues of the same emitent)', () => {
    const data = {
      securities: {
        columns: ['secid', 'shortname', 'is_traded'],
        data: [
          ['SBER', 'Сбербанк', 1],
          ['SBER', 'Сбербанк', 1],
        ],
      },
    };
    expect(extractSecuritySearchResults(data)).toEqual([{ secid: 'SBER', shortname: 'Сбербанк' }]);
  });

  it('returns an empty array for malformed or missing input', () => {
    expect(extractSecuritySearchResults(null)).toEqual([]);
    expect(extractSecuritySearchResults({})).toEqual([]);
  });
});

describe('searchMoexSecurities', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns an empty array without a network request for a blank query', async () => {
    const fetchMock: FetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(await searchMoexSecurities('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('URL-encodes the query and returns parsed, capped results', async () => {
    const fetchMock: FetchMock = jest.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({
        securities: {
          columns: ['secid', 'shortname', 'is_traded'],
          data: Array.from({ length: 15 }, (_, i) => [`T${i}`, `Компания ${i}`, 1]),
        },
      }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const results = await searchMoexSecurities('Х5 Group');
    expect(fetchMock.mock.calls[0][0]).toContain(encodeURIComponent('Х5 Group'));
    expect(results).toHaveLength(10);
  });

  it('throws a friendly error on a network failure', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(searchMoexSecurities('Сбербанк')).rejects.toThrow(MoexApiError);
  });

  it('throws when the HTTP response is not ok', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    await expect(searchMoexSecurities('Сбербанк')).rejects.toThrow(MoexApiError);
  });
});
