jest.mock('../database/repository', () => ({
  insertTransaction: jest.fn(async () => {}),
  updateTransaction: jest.fn(async () => {}),
  deleteTransaction: jest.fn(async () => {}),
  listTransactions: jest.fn(async () => []),
  upsertGoal: jest.fn(async () => {}),
  deleteGoal: jest.fn(async () => {}),
  listGoals: jest.fn(async () => []),
  upsertCredit: jest.fn(async () => {}),
  deleteCredit: jest.fn(async () => {}),
  listCredits: jest.fn(async () => []),
  insertCreditRepayment: jest.fn(async () => {}),
  updateCreditRepayment: jest.fn(async () => {}),
  deleteCreditRepayment: jest.fn(async () => {}),
  listCreditRepayments: jest.fn(async () => []),
  upsertBudgetLimit: jest.fn(async () => {}),
  deleteBudgetLimit: jest.fn(async () => {}),
  listBudgetLimits: jest.fn(async () => []),
  upsertRegularPayment: jest.fn(async () => {}),
  deleteRegularPayment: jest.fn(async () => {}),
  listRegularPayments: jest.fn(async () => []),
  upsertDeposit: jest.fn(async () => {}),
  deleteDeposit: jest.fn(async () => {}),
  listDeposits: jest.fn(async () => []),
  upsertSavingsAccount: jest.fn(async () => {}),
  deleteSavingsAccount: jest.fn(async () => {}),
  listSavingsAccounts: jest.fn(async () => []),
  insertSavingsAccrual: jest.fn(async () => {}),
  listSavingsAccruals: jest.fn(async () => []),
  upsertInvestment: jest.fn(async () => {}),
  deleteInvestment: jest.fn(async () => {}),
  listInvestments: jest.fn(async () => []),
  insertInvestmentPayout: jest.fn(async () => {}),
  updateInvestmentPayout: jest.fn(async () => {}),
  deleteInvestmentPayout: jest.fn(async () => {}),
  listInvestmentPayouts: jest.fn(async () => []),
  upsertFriendDebt: jest.fn(async () => {}),
  deleteFriendDebt: jest.fn(async () => {}),
  listFriendDebts: jest.fn(async () => []),
  upsertInsurancePolicy: jest.fn(async () => {}),
  deleteInsurancePolicy: jest.fn(async () => {}),
  listInsurancePolicies: jest.fn(async () => []),
  upsertWishlistItem: jest.fn(async () => {}),
  deleteWishlistItem: jest.fn(async () => {}),
  listWishlistItems: jest.fn(async () => []),
  insertNotification: jest.fn(async () => {}),
  markNotificationRead: jest.fn(async () => {}),
  markAllNotificationsRead: jest.fn(async () => {}),
  deleteNotification: jest.fn(async () => {}),
  listNotifications: jest.fn(async () => []),
  upsertCashbackCard: jest.fn(async () => {}),
  deleteCashbackCard: jest.fn(async () => {}),
  listCashbackCards: jest.fn(async () => []),
  upsertAchievement: jest.fn(async () => {}),
  listAchievements: jest.fn(async () => []),
  upsertRecurringTemplate: jest.fn(async () => {}),
  deleteRecurringTemplate: jest.fn(async () => {}),
  listRecurringTemplates: jest.fn(async () => []),
  upsertUserProfile: jest.fn(async () => {}),
  getUserProfile: jest.fn(async () => null),
  resetAllData: jest.fn(async () => {}),
}));

jest.mock('../database/seed', () => ({
  seedDemoDataIfNeeded: jest.fn(async () => {}),
  SEED_FLAG_KEY: 'seed_flag',
}));

jest.mock('../database/client', () => ({
  setMeta: jest.fn(async () => {}),
}));

import { useFinanceStore } from '../store/financeStore';
import * as repo from '../database/repository';
import { setMeta } from '../database/client';
import type { Credit, CreditRepayment, Goal, SavingsAccount, Investment, CashbackCard } from '../types';

const initialState = useFinanceStore.getState();

function resetStore() {
  useFinanceStore.setState(initialState, true);
  jest.clearAllMocks();
}

beforeEach(resetStore);

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'credit-1',
    kind: 'credit',
    name: 'Кредит',
    amount: 100000,
    rate: 12,
    termMonths: 12,
    monthlyPayment: 5000,
    remaining: 100000,
    nextPaymentDate: new Date('2026-08-01'),
    startDate: new Date('2026-01-01'),
    currency: 'RUB',
    ...overrides,
  };
}

describe('financeStore transactions', () => {
  it('addTransaction generates an id, persists it, and prepends it to state', async () => {
    await useFinanceStore.getState().addTransaction({
      amount: 500,
      category: 'Продукты',
      type: 'expense',
      date: new Date('2026-06-01'),
      currency: 'RUB',
    });

    const { transactions } = useFinanceStore.getState();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBeTruthy();
    expect(repo.insertTransaction).toHaveBeenCalledWith(transactions[0]);
  });

  it('removeTransaction deletes from the db and drops it from state', async () => {
    useFinanceStore.setState({
      transactions: [{ id: 't1', amount: 1, category: 'X', type: 'expense', date: new Date(), currency: 'RUB' }],
    });
    await useFinanceStore.getState().removeTransaction('t1');
    expect(repo.deleteTransaction).toHaveBeenCalledWith('t1');
    expect(useFinanceStore.getState().transactions).toHaveLength(0);
  });
});

describe('financeStore.saveGoal', () => {
  it('creates a new goal when no id is given, and updates in place when one is', async () => {
    await useFinanceStore.getState().saveGoal({
      name: 'Отпуск',
      targetAmount: 1000,
      savedAmount: 0,
      deadline: new Date('2026-12-31'),
      priority: 'high',
    });
    const created = useFinanceStore.getState().goals[0];
    expect(created.id).toBeTruthy();

    const updated: Goal = { ...created, savedAmount: 500 };
    await useFinanceStore.getState().saveGoal(updated);

    const { goals } = useFinanceStore.getState();
    expect(goals).toHaveLength(1);
    expect(goals[0].savedAmount).toBe(500);
    expect(repo.upsertGoal).toHaveBeenCalledTimes(2);
  });
});

describe('financeStore credit repayments', () => {
  it('repayCredit records a partial repayment and reduces remaining by the full amount', async () => {
    useFinanceStore.setState({ credits: [makeCredit()] });
    await useFinanceStore.getState().repayCredit('credit-1', 20000, new Date('2026-03-01'));

    const { credits, creditRepayments } = useFinanceStore.getState();
    expect(credits[0].remaining).toBe(80000);
    expect(creditRepayments[0]).toMatchObject({ type: 'partial', amount: 20000, principalPortion: 20000 });
    expect(repo.upsertCredit).toHaveBeenCalledWith(expect.objectContaining({ remaining: 80000 }));
    expect(repo.insertCreditRepayment).toHaveBeenCalled();
  });

  it('repayCredit also records a matching cash-expense transaction and links it', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ kind: 'mortgage' })] });
    await useFinanceStore.getState().repayCredit('credit-1', 20000, new Date('2026-03-01'));

    const { creditRepayments, transactions } = useFinanceStore.getState();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ amount: 20000, type: 'expense', category: 'Ипотека' });
    expect(creditRepayments[0].transactionId).toBe(transactions[0].id);
    expect(repo.insertTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 20000 }));
  });

  it('repayCredit marks the repayment as full once the balance reaches zero', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ remaining: 5000 })] });
    await useFinanceStore.getState().repayCredit('credit-1', 5000, new Date('2026-03-01'));

    const { credits, creditRepayments } = useFinanceStore.getState();
    expect(credits[0].remaining).toBe(0);
    expect(creditRepayments[0].type).toBe('full');
  });

  it('repayCredit ignores non-positive amounts and unknown credits', async () => {
    useFinanceStore.setState({ credits: [makeCredit()] });
    await useFinanceStore.getState().repayCredit('credit-1', 0, new Date());
    await useFinanceStore.getState().repayCredit('missing', 100, new Date());
    expect(repo.upsertCredit).not.toHaveBeenCalled();
    expect(repo.insertCreditRepayment).not.toHaveBeenCalled();
  });

  it('makePayment splits the payment into interest and principal and advances nextPaymentDate by a month', async () => {
    useFinanceStore.setState({ credits: [makeCredit({ remaining: 100000, rate: 12, nextPaymentDate: new Date('2026-08-01') })] });
    await useFinanceStore.getState().makePayment('credit-1', 5000, new Date('2026-08-01'));

    const { credits, creditRepayments, transactions } = useFinanceStore.getState();
    // monthlyRate = 1% -> interest = 1000, principal = 4000
    expect(creditRepayments[0]).toMatchObject({ type: 'regular', principalPortion: 4000 });
    expect(credits[0].remaining).toBe(96000);
    expect(credits[0].nextPaymentDate.toISOString()).toBe(new Date('2026-09-01').toISOString());
    // The full payment (interest + principal), not just the principal portion, leaves the cash balance.
    expect(transactions[0]).toMatchObject({ amount: 5000, type: 'expense', category: 'Кредит' });
    expect(creditRepayments[0].transactionId).toBe(transactions[0].id);
  });

  it('editCreditRepayment rolls back the old effect on remaining before applying the new amount', async () => {
    const credit = makeCredit({ remaining: 80000 });
    const repayment: CreditRepayment = {
      id: 'r1', creditId: 'credit-1', date: new Date('2026-03-01'), amount: 20000, type: 'partial', principalPortion: 20000,
    };
    useFinanceStore.setState({ credits: [credit], creditRepayments: [repayment] });

    await useFinanceStore.getState().editCreditRepayment('r1', 30000, new Date('2026-03-05'));

    const { credits, creditRepayments } = useFinanceStore.getState();
    // remaining before this repayment was 80000 + 20000 = 100000; a 30000 partial repayment brings it to 70000
    expect(credits[0].remaining).toBe(70000);
    expect(creditRepayments[0]).toMatchObject({ amount: 30000, principalPortion: 30000 });
  });

  it('removeCreditRepayment returns the principal portion back to remaining', async () => {
    const credit = makeCredit({ remaining: 80000 });
    const repayment: CreditRepayment = {
      id: 'r1', creditId: 'credit-1', date: new Date('2026-03-01'), amount: 20000, type: 'partial', principalPortion: 20000,
    };
    useFinanceStore.setState({ credits: [credit], creditRepayments: [repayment] });

    await useFinanceStore.getState().removeCreditRepayment('r1');

    const { credits, creditRepayments } = useFinanceStore.getState();
    expect(credits[0].remaining).toBe(100000);
    expect(creditRepayments).toHaveLength(0);
  });

  it('editCreditRepayment keeps the linked transaction amount/date in sync', async () => {
    const credit = makeCredit({ remaining: 80000 });
    const repayment: CreditRepayment = {
      id: 'r1', creditId: 'credit-1', date: new Date('2026-03-01'), amount: 20000, type: 'partial',
      principalPortion: 20000, transactionId: 'tx-1',
    };
    const transaction = {
      id: 'tx-1', amount: 20000, category: 'Кредит', type: 'expense' as const,
      date: new Date('2026-03-01'), currency: 'RUB' as const,
    };
    useFinanceStore.setState({ credits: [credit], creditRepayments: [repayment], transactions: [transaction] });

    await useFinanceStore.getState().editCreditRepayment('r1', 30000, new Date('2026-03-05'));

    const { transactions } = useFinanceStore.getState();
    expect(transactions[0]).toMatchObject({ id: 'tx-1', amount: 30000, date: new Date('2026-03-05') });
    expect(repo.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 30000 }));
  });

  it('removeCreditRepayment also removes the linked transaction', async () => {
    const credit = makeCredit({ remaining: 80000 });
    const repayment: CreditRepayment = {
      id: 'r1', creditId: 'credit-1', date: new Date('2026-03-01'), amount: 20000, type: 'partial',
      principalPortion: 20000, transactionId: 'tx-1',
    };
    const transaction = {
      id: 'tx-1', amount: 20000, category: 'Кредит', type: 'expense' as const,
      date: new Date('2026-03-01'), currency: 'RUB' as const,
    };
    useFinanceStore.setState({ credits: [credit], creditRepayments: [repayment], transactions: [transaction] });

    await useFinanceStore.getState().removeCreditRepayment('r1');

    const { transactions } = useFinanceStore.getState();
    expect(transactions).toHaveLength(0);
    expect(repo.deleteTransaction).toHaveBeenCalledWith('tx-1');
  });
});

describe('financeStore.accrueSavingsInterest', () => {
  function makeAccount(overrides: Partial<SavingsAccount> = {}): SavingsAccount {
    return {
      id: 'acc-1', name: 'Копилка', balance: 10000, rate: 12,
      lastAccrualDate: new Date('2026-01-01'), currency: 'RUB',
      ...overrides,
    };
  }

  it('does nothing for an account accrued this month', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ lastAccrualDate: new Date() })] });
    await useFinanceStore.getState().accrueSavingsInterest();
    expect(repo.upsertSavingsAccount).not.toHaveBeenCalled();
    expect(repo.insertSavingsAccrual).not.toHaveBeenCalled();
  });

  it('accrues one month of interest at a time, compounding on the growing balance', async () => {
    // lastAccrualDate two full months before "now" (mocked below)
    jest.useFakeTimers().setSystemTime(new Date('2026-03-01'));
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 10000, rate: 12, lastAccrualDate: new Date('2026-01-01') })] });

    await useFinanceStore.getState().accrueSavingsInterest();

    // monthly rate = 1%: month 1 => 10000 + 100 = 10100; month 2 => 10100 + 101 = 10201
    const { savingsAccounts, savingsAccruals } = useFinanceStore.getState();
    expect(savingsAccounts[0].balance).toBe(10201);
    expect(savingsAccruals).toHaveLength(2);
    expect(repo.upsertSavingsAccount).toHaveBeenCalledTimes(1);
    expect(repo.insertSavingsAccrual).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe('financeStore.transferSavingsAccountToCash', () => {
  function makeAccount(overrides: Partial<SavingsAccount> = {}): SavingsAccount {
    return {
      id: 'acc-1', name: 'Копилка', balance: 10000, rate: 12,
      lastAccrualDate: new Date('2026-01-01'), currency: 'RUB',
      ...overrides,
    };
  }

  it('moves part of the balance into a cash-income transaction', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 10000 })] });

    await useFinanceStore.getState().transferSavingsAccountToCash('acc-1', 4000);

    const { savingsAccounts, transactions } = useFinanceStore.getState();
    expect(savingsAccounts[0].balance).toBe(6000);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ amount: 4000, type: 'income', category: 'Перевод со счёта' });
    expect(repo.upsertSavingsAccount).toHaveBeenCalledWith(expect.objectContaining({ balance: 6000 }));
    expect(repo.insertTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 4000 }));
  });

  it('refuses to push the balance below zero', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 1000 })] });

    await useFinanceStore.getState().transferSavingsAccountToCash('acc-1', 5000);

    const { savingsAccounts, transactions } = useFinanceStore.getState();
    expect(savingsAccounts[0].balance).toBe(1000);
    expect(transactions).toHaveLength(0);
    expect(repo.upsertSavingsAccount).not.toHaveBeenCalled();
    expect(repo.insertTransaction).not.toHaveBeenCalled();
  });

  it('refuses a zero or negative amount', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 1000 })] });

    await useFinanceStore.getState().transferSavingsAccountToCash('acc-1', 0);

    expect(useFinanceStore.getState().savingsAccounts[0].balance).toBe(1000);
    expect(repo.upsertSavingsAccount).not.toHaveBeenCalled();
  });
});

describe('financeStore.depositToSavingsAccountFromCash', () => {
  function makeAccount(overrides: Partial<SavingsAccount> = {}): SavingsAccount {
    return {
      id: 'acc-1', name: 'Копилка', balance: 10000, rate: 12,
      lastAccrualDate: new Date('2026-01-01'), currency: 'RUB',
      ...overrides,
    };
  }

  it('increases the balance and adds a matching cash-expense transaction', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 10000 })] });

    await useFinanceStore.getState().depositToSavingsAccountFromCash('acc-1', 4000);

    const { savingsAccounts, transactions } = useFinanceStore.getState();
    expect(savingsAccounts[0].balance).toBe(14000);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ amount: 4000, type: 'expense', category: 'Перевод на счёт' });
    expect(repo.upsertSavingsAccount).toHaveBeenCalledWith(expect.objectContaining({ balance: 14000 }));
    expect(repo.insertTransaction).toHaveBeenCalledWith(expect.objectContaining({ amount: 4000 }));
  });

  it('refuses a zero or negative amount', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount({ balance: 1000 })] });

    await useFinanceStore.getState().depositToSavingsAccountFromCash('acc-1', 0);

    expect(useFinanceStore.getState().savingsAccounts[0].balance).toBe(1000);
    expect(repo.upsertSavingsAccount).not.toHaveBeenCalled();
  });

  it('ignores an unknown account', async () => {
    useFinanceStore.setState({ savingsAccounts: [makeAccount()] });

    await useFinanceStore.getState().depositToSavingsAccountFromCash('missing', 100);

    expect(repo.upsertSavingsAccount).not.toHaveBeenCalled();
    expect(repo.insertTransaction).not.toHaveBeenCalled();
  });
});

describe('financeStore.resetAll', () => {
  it('wipes the database, re-marks demo data as seeded, and clears in-memory state', async () => {
    useFinanceStore.setState({ transactions: [{ id: 't1' }] as any, isLoaded: true });
    await useFinanceStore.getState().resetAll();

    expect(repo.resetAllData).toHaveBeenCalled();
    expect(setMeta).toHaveBeenCalledWith('seed_flag', 'true');
    const state = useFinanceStore.getState();
    expect(state.transactions).toEqual([]);
    expect(state.isLoaded).toBe(false);
  });
});

describe('financeStore.checkAndUnlockAchievements', () => {
  it('unlocks "Первая транзакция" once a transaction exists', async () => {
    useFinanceStore.setState({
      transactions: [{ id: 't1', amount: 1, category: 'X', type: 'expense', date: new Date(), currency: 'RUB' }],
      achievements: [{ id: 'a1', title: 'Первая транзакция', description: '', isUnlocked: false }],
    });
    await useFinanceStore.getState().checkAndUnlockAchievements();
    expect(useFinanceStore.getState().achievements[0].isUnlocked).toBe(true);
    expect(repo.upsertAchievement).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', isUnlocked: true }));
  });

  it('does not re-unlock an already-unlocked achievement', async () => {
    useFinanceStore.setState({
      transactions: [{ id: 't1', amount: 1, category: 'X', type: 'expense', date: new Date(), currency: 'RUB' }],
      achievements: [{ id: 'a1', title: 'Первая транзакция', description: '', isUnlocked: true, unlockedDate: new Date('2026-01-01') }],
    });
    await useFinanceStore.getState().checkAndUnlockAchievements();
    expect(repo.upsertAchievement).not.toHaveBeenCalled();
  });

  it('leaves a threshold achievement locked until the threshold is met', async () => {
    useFinanceStore.setState({
      goals: [{ id: 'g1', name: 'X', targetAmount: 200000, savedAmount: 50000, deadline: new Date(), priority: 'high' }],
      achievements: [{ id: 'a1', title: 'Сохранил 100 000 ₽', description: '', isUnlocked: false }],
    });
    await useFinanceStore.getState().checkAndUnlockAchievements();
    expect(useFinanceStore.getState().achievements[0].isUnlocked).toBe(false);
  });
});

describe('financeStore.importBackup', () => {
  it('upserts every present entity type and reloads state from the database', async () => {
    const credit = makeCredit();
    await useFinanceStore.getState().importBackup({
      goals: [{ id: 'g1', name: 'X', targetAmount: 1, savedAmount: 0, deadline: new Date(), priority: 'low' }],
      credits: [credit],
    });
    expect(repo.upsertGoal).toHaveBeenCalledTimes(1);
    expect(repo.upsertCredit).toHaveBeenCalledWith(credit);
    // importBackup finishes with loadAll(), which re-reads every list from the (mocked) repository
    expect(repo.listTransactions).toHaveBeenCalled();
  });

  it('falls back to update when inserting a transaction whose id already exists', async () => {
    (repo.insertTransaction as jest.Mock).mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    const tx = { id: 't1', amount: 1, category: 'X', type: 'expense' as const, date: new Date(), currency: 'RUB' as const };

    await useFinanceStore.getState().importBackup({ transactions: [tx] });

    expect(repo.insertTransaction).toHaveBeenCalledWith(tx);
    expect(repo.updateTransaction).toHaveBeenCalledWith(tx);
  });

  it('silently skips a duplicate savings accrual instead of throwing', async () => {
    (repo.insertSavingsAccrual as jest.Mock).mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    const accrual = { id: 'ac1', accountId: 'acc-1', date: new Date(), amount: 10 };

    await expect(useFinanceStore.getState().importBackup({ savingsAccruals: [accrual] })).resolves.toBeUndefined();
    expect(repo.insertSavingsAccrual).toHaveBeenCalledWith(accrual);
  });

  it('silently skips a duplicate notification instead of throwing', async () => {
    (repo.insertNotification as jest.Mock).mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    const notification = { id: 'n1', type: 'payment' as const, title: 'X', message: 'Y', date: new Date(), isRead: false };

    await expect(useFinanceStore.getState().importBackup({ notifications: [notification] })).resolves.toBeUndefined();
    expect(repo.insertNotification).toHaveBeenCalledWith(notification);
  });
});

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'inv-1', name: 'Сбербанк', assetType: 'stock', quantity: 10,
    purchasePrice: 250, currentPrice: 300, currency: 'RUB',
    ...overrides,
  };
}

describe('financeStore investment payouts', () => {
  it('addInvestmentPayout also records a linked income transaction', async () => {
    useFinanceStore.setState({ investments: [makeInvestment()] });

    await useFinanceStore.getState().addInvestmentPayout('inv-1', 500, new Date('2026-03-01'));

    const { investmentPayouts, transactions } = useFinanceStore.getState();
    expect(investmentPayouts[0]).toMatchObject({ amount: 500, investmentId: 'inv-1' });
    expect(transactions[0]).toMatchObject({ amount: 500, type: 'income', category: 'Инвестиции', currency: 'RUB' });
    expect(investmentPayouts[0].transactionId).toBe(transactions[0].id);
  });

  it('editInvestmentPayout keeps the linked transaction in sync', async () => {
    const payout = { id: 'p1', investmentId: 'inv-1', date: new Date('2026-03-01'), amount: 500, transactionId: 'tx-1' };
    const transaction = {
      id: 'tx-1', amount: 500, category: 'Инвестиции', type: 'income' as const,
      date: new Date('2026-03-01'), currency: 'RUB' as const,
    };
    useFinanceStore.setState({ investments: [makeInvestment()], investmentPayouts: [payout], transactions: [transaction] });

    await useFinanceStore.getState().editInvestmentPayout('p1', 700, new Date('2026-03-05'));

    const { transactions: updated } = useFinanceStore.getState();
    expect(updated[0]).toMatchObject({ id: 'tx-1', amount: 700, date: new Date('2026-03-05') });
  });

  it('removeInvestmentPayout also removes the linked transaction', async () => {
    const payout = { id: 'p1', investmentId: 'inv-1', date: new Date('2026-03-01'), amount: 500, transactionId: 'tx-1' };
    const transaction = {
      id: 'tx-1', amount: 500, category: 'Инвестиции', type: 'income' as const,
      date: new Date('2026-03-01'), currency: 'RUB' as const,
    };
    useFinanceStore.setState({ investments: [makeInvestment()], investmentPayouts: [payout], transactions: [transaction] });

    await useFinanceStore.getState().removeInvestmentPayout('p1');

    const { transactions: remaining } = useFinanceStore.getState();
    expect(remaining).toHaveLength(0);
    expect(repo.deleteTransaction).toHaveBeenCalledWith('tx-1');
  });
});

function makeCashbackCard(overrides: Partial<CashbackCard> = {}): CashbackCard {
  return { id: 'cb-1', name: 'Тинькофф Блэк', cashbackPercent: 5, accumulated: 1000, ...overrides };
}

describe('financeStore cashback', () => {
  it('accrueCashback increases the accumulated balance without creating a transaction', async () => {
    useFinanceStore.setState({ cashbackCards: [makeCashbackCard({ accumulated: 1000 })] });

    await useFinanceStore.getState().accrueCashback('cb-1', 200);

    const { cashbackCards, transactions } = useFinanceStore.getState();
    expect(cashbackCards[0].accumulated).toBe(1200);
    expect(transactions).toHaveLength(0);
  });

  it('redeemCashback decreases the balance and adds an income transaction', async () => {
    useFinanceStore.setState({ cashbackCards: [makeCashbackCard({ accumulated: 1000 })] });

    await useFinanceStore.getState().redeemCashback('cb-1', 400);

    const { cashbackCards, transactions } = useFinanceStore.getState();
    expect(cashbackCards[0].accumulated).toBe(600);
    expect(transactions[0]).toMatchObject({ amount: 400, type: 'income', category: 'Кэшбэк' });
  });

  it('refuses to redeem more than is accumulated', async () => {
    useFinanceStore.setState({ cashbackCards: [makeCashbackCard({ accumulated: 100 })] });

    await useFinanceStore.getState().redeemCashback('cb-1', 500);

    const { cashbackCards, transactions } = useFinanceStore.getState();
    expect(cashbackCards[0].accumulated).toBe(100);
    expect(transactions).toHaveLength(0);
  });
});
