import { renderHook } from '@testing-library/react-native';
import { useObligationEvents } from '../hooks/useFinancials';
import { useFinanceStore } from '../store/financeStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Credit, RegularPayment } from '../types';

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
});
