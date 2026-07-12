import { reviveBackupData, countBackupEntries } from '../utils/backup';

describe('reviveBackupData', () => {
  it('returns an empty object for non-object input', () => {
    expect(reviveBackupData(null)).toEqual({});
    expect(reviveBackupData('not an object')).toEqual({});
    expect(reviveBackupData(undefined)).toEqual({});
  });

  it('revives ISO date strings back into Date instances', () => {
    const raw = {
      transactions: [{ id: 't1', amount: 100, category: 'Продукты', type: 'expense', date: '2026-06-01T00:00:00.000Z', currency: 'RUB' }],
      goals: [{ id: 'g1', name: 'Отпуск', targetAmount: 1000, savedAmount: 0, deadline: '2026-12-31T00:00:00.000Z', priority: 'high' }],
    };
    const data = reviveBackupData(raw);
    expect(data.transactions?.[0].date).toBeInstanceOf(Date);
    expect(data.transactions?.[0].date.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(data.goals?.[0].deadline).toBeInstanceOf(Date);
  });

  it('defaults missing currency to RUB for older export formats', () => {
    const raw = {
      credits: [
        {
          id: 'c1', kind: 'credit', name: 'Кредит', amount: 1000, rate: 10, termMonths: 12,
          monthlyPayment: 100, remaining: 900, nextPaymentDate: '2026-08-01T00:00:00.000Z',
          startDate: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const data = reviveBackupData(raw);
    expect(data.credits?.[0].currency).toBe('RUB');
  });

  it('preserves an explicit currency instead of overwriting it', () => {
    const raw = {
      deposits: [
        { id: 'd1', name: 'Вклад', amount: 500, rate: 5, openDate: '2026-01-01T00:00:00.000Z', closeDate: '2027-01-01T00:00:00.000Z', currency: 'USD' },
      ],
    };
    const data = reviveBackupData(raw);
    expect(data.deposits?.[0].currency).toBe('USD');
  });

  it('ignores fields that are not arrays', () => {
    const data = reviveBackupData({ transactions: 'oops', goals: null });
    expect(data.transactions).toBeUndefined();
    expect(data.goals).toBeUndefined();
  });
});

describe('countBackupEntries', () => {
  it('returns 0 for an empty backup', () => {
    expect(countBackupEntries({})).toBe(0);
  });

  it('sums array lengths across all entity types', () => {
    const data = reviveBackupData({
      transactions: [{ id: '1' }, { id: '2' }],
      goals: [{ id: '3' }],
    });
    expect(countBackupEntries(data)).toBe(3);
  });

  it('counts a present profile object as a single entry', () => {
    const data = reviveBackupData({
      profile: { id: 'p1', name: 'Я', registeredAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(countBackupEntries(data)).toBe(1);
  });
});
