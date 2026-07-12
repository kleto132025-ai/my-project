import { renderHook } from '@testing-library/react-native';
import { useObligationEvents } from '../hooks/useFinancials';
import { useFinanceStore } from '../store/financeStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Credit, InsurancePolicy, RegularPayment } from '../types';

const financeInitialState = useFinanceStore.getState();
const settingsInitialState = useSettingsStore.getState();

beforeEach(() => {
  useFinanceStore.setState(financeInitialState, true);
  useSettingsStore.setState(settingsInitialState, true);
  jest.useFakeTimers().setSystemTime(new Date('2026-06-10'));
});

afterEach(() => {
  jest.useRealTimers();
});

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'c1', kind: 'credit', name: 'Автокредит', amount: 100000, rate: 12, termMonths: 12,
    monthlyPayment: 5000, remaining: 50000, nextPaymentDate: new Date('2026-06-15'),
    startDate: new Date('2026-01-01'), currency: 'RUB',
    ...overrides,
  };
}

describe('useObligationEvents', () => {
  it('marks a credit payment on its nextPaymentDate', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ nextPaymentDate: new Date('2026-06-15') })] });
    const { result } = await renderHook(() => useObligationEvents());
    const events = result.current.get(dateKey(new Date('2026-06-15')));
    expect(events).toEqual([{ label: 'Кредит «Автокредит»', amount: 5000 }]);
  });

  it('marks a fixed-day regular payment on a single date', async () => {
    const payment: RegularPayment = {
      id: 'r1', name: 'Интернет', amount: 800, category: 'Связь', dayOfMonth: 15, isActive: true, type: 'expense',
    };
    useFinanceStore.setState({ regularPayments: [payment] });
    const { result } = await renderHook(() => useObligationEvents());
    expect(result.current.get(dateKey(new Date('2026-06-15')))).toEqual([{ label: 'Интернет', amount: 800 }]);
    expect(result.current.get(dateKey(new Date('2026-06-14')))).toBeUndefined();
  });

  it('marks every day of a ranged regular payment window (e.g. ЖКХ 1–10 число)', async () => {
    const payment: RegularPayment = {
      id: 'r1', name: 'ЖКХ', amount: 4500, category: 'Жильё', dayOfMonth: 1, dayOfMonthEnd: 10, isActive: true, type: 'expense',
    };
    useFinanceStore.setState({ regularPayments: [payment] });
    const { result } = await renderHook(() => useObligationEvents());

    for (let day = 1; day <= 10; day++) {
      const events = result.current.get(dateKey(new Date(2026, 5, day)));
      expect(events).toEqual([{ label: 'ЖКХ (можно оплатить 1–10 числа)', amount: 4500 }]);
    }
    expect(result.current.get(dateKey(new Date(2026, 5, 11)))).toBeUndefined();
  });

  it('excludes an inactive regular payment', async () => {
    const payment: RegularPayment = {
      id: 'r1', name: 'Отключено', amount: 100, category: 'Связь', dayOfMonth: 15, isActive: false, type: 'expense',
    };
    useFinanceStore.setState({ regularPayments: [payment] });
    const { result } = await renderHook(() => useObligationEvents());
    expect(result.current.size).toBe(0);
  });

  it('accumulates multiple events on the same date', async () => {
    const payment: RegularPayment = {
      id: 'r1', name: 'Интернет', amount: 800, category: 'Связь', dayOfMonth: 15, isActive: true, type: 'expense',
    };
    useFinanceStore.setState({
      credits: [makeCredit({ nextPaymentDate: new Date('2026-06-15') })],
      regularPayments: [payment],
    });
    const { result } = await renderHook(() => useObligationEvents());
    expect(result.current.get(dateKey(new Date('2026-06-15')))).toHaveLength(2);
  });

  it('clamps a day-range window to the actual number of days in the month instead of rolling into the next month', async () => {
    jest.setSystemTime(new Date('2026-02-10')); // 2026 is not a leap year — February has 28 days
    const payment: RegularPayment = {
      id: 'r1', name: 'ЖКХ', amount: 4500, category: 'Жильё', dayOfMonth: 25, dayOfMonthEnd: 31, isActive: true, type: 'expense',
    };
    useFinanceStore.setState({ regularPayments: [payment] });
    const { result } = await renderHook(() => useObligationEvents());

    for (let day = 25; day <= 28; day++) {
      expect(result.current.get(dateKey(new Date(2026, 1, day)))).toHaveLength(1);
    }
    // Would roll into March 1-3 if not clamped — must not be marked there.
    expect(result.current.get(dateKey(new Date(2026, 2, 1)))).toBeUndefined();
    expect(result.current.get(dateKey(new Date(2026, 2, 2)))).toBeUndefined();
    expect(result.current.get(dateKey(new Date(2026, 2, 3)))).toBeUndefined();
  });

  it('clamps a single monthly-insurance day the same way', async () => {
    jest.setSystemTime(new Date('2026-02-10'));
    const policy: InsurancePolicy = {
      id: 'p1', type: 'Жизнь', insurer: 'СОГАЗ', amount: 2000,
      endDate: new Date('2020-01-31'), paymentFrequency: 'monthly',
    };
    useFinanceStore.setState({ insurancePolicies: [policy] });
    const { result } = await renderHook(() => useObligationEvents());
    expect(result.current.get(dateKey(new Date(2026, 1, 28)))).toHaveLength(1);
    expect(result.current.get(dateKey(new Date(2026, 2, 3)))).toBeUndefined();
  });

  it('marks a recurring regular payment in nearby months too, not just the current one', async () => {
    const payment: RegularPayment = {
      id: 'r1', name: 'Интернет', amount: 800, category: 'Связь', dayOfMonth: 15, isActive: true, type: 'expense',
    };
    useFinanceStore.setState({ regularPayments: [payment] });
    const { result } = await renderHook(() => useObligationEvents());

    // "now" is mocked to 2026-06-10 — should also appear when the calendar is paged
    // to May (offset -1) and July/August (offsets +1/+2), not just June.
    expect(result.current.get(dateKey(new Date(2026, 4, 15)))).toHaveLength(1);
    expect(result.current.get(dateKey(new Date(2026, 6, 15)))).toHaveLength(1);
    expect(result.current.get(dateKey(new Date(2026, 7, 15)))).toHaveLength(1);
  });
});
