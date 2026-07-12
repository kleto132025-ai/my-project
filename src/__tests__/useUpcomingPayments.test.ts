import { renderHook } from '@testing-library/react-native';
import { useUpcomingPayments } from '../hooks/useFinancials';
import { useFinanceStore } from '../store/financeStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Credit, FriendDebt, InsurancePolicy, RegularPayment } from '../types';

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

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'c1', kind: 'credit', name: 'Автокредит', amount: 100000, rate: 12, termMonths: 12,
    monthlyPayment: 5000, remaining: 50000, nextPaymentDate: new Date('2026-06-12'),
    startDate: new Date('2026-01-01'), currency: 'RUB',
    ...overrides,
  };
}

describe('useUpcomingPayments', () => {
  it('includes a credit payment due within the window and sorts by date', async () => {
    useFinanceStore.setState({
      credits: [makeCredit({ id: 'c1', nextPaymentDate: new Date('2026-06-15') }), makeCredit({ id: 'c2', nextPaymentDate: new Date('2026-06-11') })],
    });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current.map((e) => e.id)).toEqual(['credit-c2', 'credit-c1']);
  });

  it('excludes a credit that is already fully repaid', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ remaining: 0, nextPaymentDate: new Date('2026-06-12') })] });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current).toHaveLength(0);
  });

  it('excludes a credit payment outside the requested window', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ nextPaymentDate: new Date('2026-06-25') })] });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current).toHaveLength(0);
  });

  it('includes an unpaid friend debt reminder but excludes a paid one', async () => {
    const debts: FriendDebt[] = [
      { id: 'd1', personName: 'Иван', amount: 1000, status: 'owed_to_me', isPaid: false, reminderDate: new Date('2026-06-12') },
      { id: 'd2', personName: 'Пётр', amount: 500, status: 'i_owe', isPaid: true, reminderDate: new Date('2026-06-13') },
    ];
    useFinanceStore.setState({ friendDebts: debts });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current.map((e) => e.id)).toEqual(['debt-d1']);
  });

  it('places an annual insurance policy on its endDate', async () => {
    const policy: InsurancePolicy = {
      id: 'p1', type: 'ОСАГО', insurer: 'Ингосстрах', amount: 8000,
      endDate: new Date('2026-06-14'), paymentFrequency: 'annual',
    };
    useFinanceStore.setState({ insurancePolicies: [policy] });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current[0]).toMatchObject({ id: 'insurance-p1', amount: 8000 });
  });

  it('rolls a monthly insurance policy to next month if this month\'s day already passed', async () => {
    const policy: InsurancePolicy = {
      id: 'p1', type: 'Жизнь', insurer: 'СОГАЗ', amount: 2000,
      endDate: new Date('2020-01-05'), paymentFrequency: 'monthly',
    };
    useFinanceStore.setState({ insurancePolicies: [policy] });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    // "now" is mocked to 2026-06-10, day 5 already passed this month -> not in a 7-day window
    expect(result.current).toHaveLength(0);
  });

  it('includes an active regular payment due this week and excludes an inactive one', async () => {
    const payments: RegularPayment[] = [
      { id: 'r1', name: 'Подписка', amount: 500, category: 'Связь', dayOfMonth: 12, isActive: true, type: 'expense' },
      { id: 'r2', name: 'Отключено', amount: 300, category: 'Связь', dayOfMonth: 12, isActive: false, type: 'expense' },
    ];
    useFinanceStore.setState({ regularPayments: payments });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current.map((e) => e.id)).toEqual(['regular-r1']);
  });

  it('converts a credit payment amount into the current display currency', async () => {
    useSettingsStore.setState({ currency: 'RUB', exchangeRates: { RUB: 1, USD: 90, EUR: 98 } });
    useFinanceStore.setState({
      credits: [makeCredit({ currency: 'USD', monthlyPayment: 100, nextPaymentDate: new Date('2026-06-12') })],
    });
    const { result } = await renderHook(() => useUpcomingPayments(7));
    expect(result.current[0].amount).toBe(9000);
  });
});
