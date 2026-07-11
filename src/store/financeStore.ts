import { create } from 'zustand';
import { generateId } from '../utils/id';
import type {
  Transaction,
  Goal,
  Credit,
  CreditRepayment,
  BudgetLimit,
  RegularPayment,
  Deposit,
  Investment,
  FriendDebt,
  InsurancePolicy,
  WishlistItem,
  AppNotification,
  CashbackCard,
  Achievement,
  RecurringTemplate,
  UserProfile,
} from '../types';
import * as repo from '../database/repository';
import { seedDemoDataIfNeeded, SEED_FLAG_KEY } from '../database/seed';
import { setMeta } from '../database/client';
import { calculateGoalProgress, calculateAmortizationStep } from '../utils/calculations';

interface FinanceState {
  isLoaded: boolean;
  transactions: Transaction[];
  goals: Goal[];
  credits: Credit[];
  creditRepayments: CreditRepayment[];
  budgetLimits: BudgetLimit[];
  regularPayments: RegularPayment[];
  deposits: Deposit[];
  investments: Investment[];
  friendDebts: FriendDebt[];
  insurancePolicies: InsurancePolicy[];
  wishlistItems: WishlistItem[];
  notifications: AppNotification[];
  cashbackCards: CashbackCard[];
  achievements: Achievement[];
  recurringTemplates: RecurringTemplate[];
  profile: UserProfile | null;

  loadAll: () => Promise<void>;

  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  saveGoal: (g: Goal | Omit<Goal, 'id'>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  saveCredit: (c: Credit | Omit<Credit, 'id'>) => Promise<void>;
  removeCredit: (id: string) => Promise<void>;
  /** Записывает частичное/полное досрочное погашение (с датой) и уменьшает остаток по кредиту. */
  repayCredit: (creditId: string, amount: number, date: Date) => Promise<void>;
  /**
   * Записывает обычный плановый платёж: часть суммы уходит на проценты, часть — на основной долг
   * (в отличие от repayCredit, где вся сумма считается досрочным погашением тела кредита).
   * Также сдвигает дату следующего платежа на месяц вперёд, чтобы календарь оставался актуальным.
   */
  makePayment: (creditId: string, amount: number, date: Date) => Promise<void>;

  saveBudgetLimit: (b: BudgetLimit | Omit<BudgetLimit, 'id'>) => Promise<void>;
  removeBudgetLimit: (id: string) => Promise<void>;

  saveRegularPayment: (p: RegularPayment | Omit<RegularPayment, 'id'>) => Promise<void>;
  removeRegularPayment: (id: string) => Promise<void>;

  saveDeposit: (d: Deposit | Omit<Deposit, 'id'>) => Promise<void>;
  removeDeposit: (id: string) => Promise<void>;

  saveInvestment: (i: Investment | Omit<Investment, 'id'>) => Promise<void>;
  removeInvestment: (id: string) => Promise<void>;

  saveFriendDebt: (d: FriendDebt | Omit<FriendDebt, 'id'>) => Promise<void>;
  removeFriendDebt: (id: string) => Promise<void>;

  saveInsurancePolicy: (p: InsurancePolicy | Omit<InsurancePolicy, 'id'>) => Promise<void>;
  removeInsurancePolicy: (id: string) => Promise<void>;

  saveWishlistItem: (w: WishlistItem | Omit<WishlistItem, 'id'>) => Promise<void>;
  removeWishlistItem: (id: string) => Promise<void>;

  addNotification: (n: Omit<AppNotification, 'id'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;

  saveCashbackCard: (c: CashbackCard | Omit<CashbackCard, 'id'>) => Promise<void>;
  removeCashbackCard: (id: string) => Promise<void>;

  unlockAchievement: (id: string) => Promise<void>;

  saveRecurringTemplate: (t: RecurringTemplate | Omit<RecurringTemplate, 'id'>) => Promise<void>;
  removeRecurringTemplate: (id: string) => Promise<void>;

  saveProfile: (p: UserProfile) => Promise<void>;

  resetAll: () => Promise<void>;

  checkAndUnlockAchievements: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  isLoaded: false,
  transactions: [],
  goals: [],
  credits: [],
  creditRepayments: [],
  budgetLimits: [],
  regularPayments: [],
  deposits: [],
  investments: [],
  friendDebts: [],
  insurancePolicies: [],
  wishlistItems: [],
  notifications: [],
  cashbackCards: [],
  achievements: [],
  recurringTemplates: [],
  profile: null,

  loadAll: async () => {
    await seedDemoDataIfNeeded();
    const [
      transactions, goals, credits, creditRepayments, budgetLimits, regularPayments, deposits, investments,
      friendDebts, insurancePolicies, wishlistItems, notifications, cashbackCards, achievements,
      recurringTemplates, profile,
    ] = await Promise.all([
      repo.listTransactions(), repo.listGoals(), repo.listCredits(), repo.listCreditRepayments(), repo.listBudgetLimits(),
      repo.listRegularPayments(), repo.listDeposits(), repo.listInvestments(),
      repo.listFriendDebts(), repo.listInsurancePolicies(), repo.listWishlistItems(),
      repo.listNotifications(), repo.listCashbackCards(), repo.listAchievements(),
      repo.listRecurringTemplates(), repo.getUserProfile(),
    ]);
    set({
      transactions, goals, credits, creditRepayments, budgetLimits, regularPayments, deposits, investments,
      friendDebts, insurancePolicies, wishlistItems, notifications, cashbackCards, achievements,
      recurringTemplates, profile, isLoaded: true,
    });
  },

  addTransaction: async (t) => {
    const transaction: Transaction = { id: generateId(), ...t };
    await repo.insertTransaction(transaction);
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
    await get().checkAndUnlockAchievements();
  },
  editTransaction: async (t) => {
    await repo.updateTransaction(t);
    set((state) => ({ transactions: state.transactions.map((x) => (x.id === t.id ? t : x)) }));
  },
  removeTransaction: async (id) => {
    await repo.deleteTransaction(id);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },

  saveGoal: async (g) => {
    const goal: Goal = 'id' in g ? g : { id: generateId(), ...g };
    await repo.upsertGoal(goal);
    set((state) => ({
      goals: state.goals.some((x) => x.id === goal.id)
        ? state.goals.map((x) => (x.id === goal.id ? goal : x))
        : [...state.goals, goal],
    }));
    await get().checkAndUnlockAchievements();
  },
  removeGoal: async (id) => {
    await repo.deleteGoal(id);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  saveCredit: async (c) => {
    const credit: Credit = 'id' in c ? c : { id: generateId(), ...c };
    await repo.upsertCredit(credit);
    set((state) => ({
      credits: state.credits.some((x) => x.id === credit.id)
        ? state.credits.map((x) => (x.id === credit.id ? credit : x))
        : [...state.credits, credit],
    }));
  },
  removeCredit: async (id) => {
    await repo.deleteCredit(id);
    set((state) => ({
      credits: state.credits.filter((c) => c.id !== id),
      creditRepayments: state.creditRepayments.filter((r) => r.creditId !== id),
    }));
  },

  repayCredit: async (creditId, amount, date) => {
    const credit = get().credits.find((c) => c.id === creditId);
    if (!credit || amount <= 0) return;

    const remaining = Math.max(credit.remaining - amount, 0);
    const isFull = remaining <= 0;
    const updatedCredit: Credit = { ...credit, remaining };
    await repo.upsertCredit(updatedCredit);

    const repayment: CreditRepayment = {
      id: generateId(),
      creditId,
      date,
      amount,
      type: isFull ? 'full' : 'partial',
    };
    await repo.insertCreditRepayment(repayment);

    set((state) => ({
      credits: state.credits.map((c) => (c.id === creditId ? updatedCredit : c)),
      creditRepayments: [repayment, ...state.creditRepayments],
    }));
    await get().checkAndUnlockAchievements();
  },

  makePayment: async (creditId, amount, date) => {
    const credit = get().credits.find((c) => c.id === creditId);
    if (!credit || amount <= 0) return;

    const { newRemaining } = calculateAmortizationStep(credit.remaining, credit.rate, amount);
    const isFull = newRemaining <= 0;

    const nextPaymentDate = new Date(credit.nextPaymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const updatedCredit: Credit = { ...credit, remaining: newRemaining, nextPaymentDate };
    await repo.upsertCredit(updatedCredit);

    const repayment: CreditRepayment = {
      id: generateId(),
      creditId,
      date,
      amount,
      type: isFull ? 'full' : 'regular',
    };
    await repo.insertCreditRepayment(repayment);

    set((state) => ({
      credits: state.credits.map((c) => (c.id === creditId ? updatedCredit : c)),
      creditRepayments: [repayment, ...state.creditRepayments],
    }));
    await get().checkAndUnlockAchievements();
  },

  saveBudgetLimit: async (b) => {
    const limit: BudgetLimit = 'id' in b ? b : { id: generateId(), ...b };
    await repo.upsertBudgetLimit(limit);
    set((state) => ({
      budgetLimits: state.budgetLimits.some((x) => x.id === limit.id)
        ? state.budgetLimits.map((x) => (x.id === limit.id ? limit : x))
        : [...state.budgetLimits, limit],
    }));
  },
  removeBudgetLimit: async (id) => {
    await repo.deleteBudgetLimit(id);
    set((state) => ({ budgetLimits: state.budgetLimits.filter((b) => b.id !== id) }));
  },

  saveRegularPayment: async (p) => {
    const payment: RegularPayment = 'id' in p ? p : { id: generateId(), ...p };
    await repo.upsertRegularPayment(payment);
    set((state) => ({
      regularPayments: state.regularPayments.some((x) => x.id === payment.id)
        ? state.regularPayments.map((x) => (x.id === payment.id ? payment : x))
        : [...state.regularPayments, payment],
    }));
  },
  removeRegularPayment: async (id) => {
    await repo.deleteRegularPayment(id);
    set((state) => ({ regularPayments: state.regularPayments.filter((p) => p.id !== id) }));
  },

  saveDeposit: async (d) => {
    const deposit: Deposit = 'id' in d ? d : { id: generateId(), ...d };
    await repo.upsertDeposit(deposit);
    set((state) => ({
      deposits: state.deposits.some((x) => x.id === deposit.id)
        ? state.deposits.map((x) => (x.id === deposit.id ? deposit : x))
        : [...state.deposits, deposit],
    }));
  },
  removeDeposit: async (id) => {
    await repo.deleteDeposit(id);
    set((state) => ({ deposits: state.deposits.filter((d) => d.id !== id) }));
  },

  saveInvestment: async (i) => {
    const investment: Investment = 'id' in i ? i : { id: generateId(), ...i };
    await repo.upsertInvestment(investment);
    set((state) => ({
      investments: state.investments.some((x) => x.id === investment.id)
        ? state.investments.map((x) => (x.id === investment.id ? investment : x))
        : [...state.investments, investment],
    }));
  },
  removeInvestment: async (id) => {
    await repo.deleteInvestment(id);
    set((state) => ({ investments: state.investments.filter((i) => i.id !== id) }));
  },

  saveFriendDebt: async (d) => {
    const debt: FriendDebt = 'id' in d ? d : { id: generateId(), ...d };
    await repo.upsertFriendDebt(debt);
    set((state) => ({
      friendDebts: state.friendDebts.some((x) => x.id === debt.id)
        ? state.friendDebts.map((x) => (x.id === debt.id ? debt : x))
        : [...state.friendDebts, debt],
    }));
  },
  removeFriendDebt: async (id) => {
    await repo.deleteFriendDebt(id);
    set((state) => ({ friendDebts: state.friendDebts.filter((d) => d.id !== id) }));
  },

  saveInsurancePolicy: async (p) => {
    const policy: InsurancePolicy = 'id' in p ? p : { id: generateId(), ...p };
    await repo.upsertInsurancePolicy(policy);
    set((state) => ({
      insurancePolicies: state.insurancePolicies.some((x) => x.id === policy.id)
        ? state.insurancePolicies.map((x) => (x.id === policy.id ? policy : x))
        : [...state.insurancePolicies, policy],
    }));
  },
  removeInsurancePolicy: async (id) => {
    await repo.deleteInsurancePolicy(id);
    set((state) => ({ insurancePolicies: state.insurancePolicies.filter((p) => p.id !== id) }));
  },

  saveWishlistItem: async (w) => {
    const item: WishlistItem = 'id' in w ? w : { id: generateId(), ...w };
    await repo.upsertWishlistItem(item);
    set((state) => ({
      wishlistItems: state.wishlistItems.some((x) => x.id === item.id)
        ? state.wishlistItems.map((x) => (x.id === item.id ? item : x))
        : [...state.wishlistItems, item],
    }));
  },
  removeWishlistItem: async (id) => {
    await repo.deleteWishlistItem(id);
    set((state) => ({ wishlistItems: state.wishlistItems.filter((w) => w.id !== id) }));
  },

  addNotification: async (n) => {
    const notification: AppNotification = { id: generateId(), ...n };
    await repo.insertNotification(notification);
    set((state) => ({ notifications: [notification, ...state.notifications] }));
  },
  markNotificationRead: async (id) => {
    await repo.markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  },
  markAllNotificationsRead: async () => {
    await repo.markAllNotificationsRead();
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, isRead: true })) }));
  },
  removeNotification: async (id) => {
    await repo.deleteNotification(id);
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
  },

  saveCashbackCard: async (c) => {
    const card: CashbackCard = 'id' in c ? c : { id: generateId(), ...c };
    await repo.upsertCashbackCard(card);
    set((state) => ({
      cashbackCards: state.cashbackCards.some((x) => x.id === card.id)
        ? state.cashbackCards.map((x) => (x.id === card.id ? card : x))
        : [...state.cashbackCards, card],
    }));
  },
  removeCashbackCard: async (id) => {
    await repo.deleteCashbackCard(id);
    set((state) => ({ cashbackCards: state.cashbackCards.filter((c) => c.id !== id) }));
  },

  unlockAchievement: async (id) => {
    const achievement = get().achievements.find((a) => a.id === id);
    if (!achievement || achievement.isUnlocked) return;
    const updated = { ...achievement, isUnlocked: true, unlockedDate: new Date() };
    await repo.upsertAchievement(updated);
    set((state) => ({
      achievements: state.achievements.map((a) => (a.id === id ? updated : a)),
    }));
  },

  saveRecurringTemplate: async (t) => {
    const template: RecurringTemplate = 'id' in t ? t : { id: generateId(), ...t };
    await repo.upsertRecurringTemplate(template);
    set((state) => ({
      recurringTemplates: state.recurringTemplates.some((x) => x.id === template.id)
        ? state.recurringTemplates.map((x) => (x.id === template.id ? template : x))
        : [...state.recurringTemplates, template],
    }));
  },
  removeRecurringTemplate: async (id) => {
    await repo.deleteRecurringTemplate(id);
    set((state) => ({ recurringTemplates: state.recurringTemplates.filter((t) => t.id !== id) }));
  },

  saveProfile: async (p) => {
    await repo.upsertUserProfile(p);
    set({ profile: p });
  },

  resetAll: async () => {
    await repo.resetAllData();
    // resetAllData() очищает и app_meta, а вместе с ним — флаг "демо-данные уже добавлены".
    // Без этой строки следующий полный перезапуск приложения снова засеет демо-данные,
    // и пользователь окажется ровно в той же ситуации, от которой пытался избавиться сбросом.
    await setMeta(SEED_FLAG_KEY, 'true');
    set({
      transactions: [], goals: [], credits: [], creditRepayments: [], budgetLimits: [], regularPayments: [],
      deposits: [], investments: [], friendDebts: [], insurancePolicies: [], wishlistItems: [],
      notifications: [], cashbackCards: [], achievements: [], recurringTemplates: [], profile: null,
      isLoaded: false,
    });
  },

  checkAndUnlockAchievements: async () => {
    const state = get();
    const totalSaved = state.goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const findByTitle = (title: string) => state.achievements.find((a) => a.title === title);

    const firstTx = findByTitle('Первая транзакция');
    if (firstTx && !firstTx.isUnlocked && state.transactions.length >= 1) {
      await get().unlockAchievement(firstTx.id);
    }
    const hundredTx = findByTitle('100 транзакций');
    if (hundredTx && !hundredTx.isUnlocked && state.transactions.length >= 100) {
      await get().unlockAchievement(hundredTx.id);
    }
    const savedGoal = findByTitle('Сохранил 100 000 ₽');
    if (savedGoal && !savedGoal.isUnlocked && totalSaved >= 100000) {
      await get().unlockAchievement(savedGoal.id);
    }
    const paidCredit = findByTitle('Погасил кредит');
    if (paidCredit && !paidCredit.isUnlocked && state.credits.some((c) => c.remaining <= 0)) {
      await get().unlockAchievement(paidCredit.id);
    }
    const finishedGoal = findByTitle('Выполнил цель');
    if (
      finishedGoal &&
      !finishedGoal.isUnlocked &&
      state.goals.some((g) => calculateGoalProgress(g.savedAmount, g.targetAmount) >= 100)
    ) {
      await get().unlockAchievement(finishedGoal.id);
    }
  },
}));
