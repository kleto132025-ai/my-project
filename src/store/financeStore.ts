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
  SavingsAccount,
  SavingsAccrual,
  Investment,
  InvestmentPayout,
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
import { useSettingsStore } from './settingsStore';
import { calculateGoalProgress, calculateAmortizationStep, calculateMonthlyInterest, monthsElapsed } from '../utils/calculations';
import type { BackupData } from '../utils/backup';
import { ACHIEVEMENT_DEFINITIONS } from '../utils/achievements';

interface FinanceState {
  isLoaded: boolean;
  transactions: Transaction[];
  goals: Goal[];
  credits: Credit[];
  creditRepayments: CreditRepayment[];
  budgetLimits: BudgetLimit[];
  regularPayments: RegularPayment[];
  deposits: Deposit[];
  savingsAccounts: SavingsAccount[];
  savingsAccruals: SavingsAccrual[];
  investments: Investment[];
  investmentPayouts: InvestmentPayout[];
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
  /**
   * Редактирует уже записанное погашение (сумму/дату) и пересчитывает остаток по кредиту:
   * сначала "откатывает" старое влияние этой записи на remaining, затем применяет новое.
   */
  editCreditRepayment: (repaymentId: string, amount: number, date: Date) => Promise<void>;
  /** Удаляет запись погашения и возвращает её долю основного долга обратно в remaining. */
  removeCreditRepayment: (repaymentId: string) => Promise<void>;

  saveBudgetLimit: (b: BudgetLimit | Omit<BudgetLimit, 'id'>) => Promise<void>;
  removeBudgetLimit: (id: string) => Promise<void>;

  saveRegularPayment: (p: RegularPayment | Omit<RegularPayment, 'id'>) => Promise<void>;
  removeRegularPayment: (id: string) => Promise<void>;

  saveDeposit: (d: Deposit | Omit<Deposit, 'id'>) => Promise<void>;
  removeDeposit: (id: string) => Promise<void>;

  saveSavingsAccount: (a: SavingsAccount | Omit<SavingsAccount, 'id'>) => Promise<void>;
  removeSavingsAccount: (id: string) => Promise<void>;
  /**
   * Начисляет проценты по всем накопительным счетам за все ещё не учтённые календарные
   * месяцы (может начислить сразу за несколько месяцев, если приложение долго не открывали).
   * Вызывается автоматически при каждой загрузке данных.
   */
  accrueSavingsInterest: () => Promise<void>;
  /**
   * Перевод части остатка накопительного счёта на "текущий счёт" (в доходы/расходы) —
   * уменьшает баланс счёта и одной операцией добавляет транзакцию-доход на ту же сумму,
   * чтобы это не пришлось вручную дублировать в двух разных разделах и не разойтись местами.
   */
  transferSavingsAccountToCash: (accountId: string, amount: number) => Promise<void>;
  /**
   * Обратная операция — пополнение накопительного счёта с текущего (кассового) остатка:
   * увеличивает баланс счёта и одной операцией добавляет транзакцию-расход на ту же сумму,
   * чтобы пополнение не пришлось вручную дублировать в двух разных разделах.
   */
  depositToSavingsAccountFromCash: (accountId: string, amount: number) => Promise<void>;

  saveInvestment: (i: Investment | Omit<Investment, 'id'>) => Promise<void>;
  removeInvestment: (id: string) => Promise<void>;

  /** Записывает дивиденд/купон по активу (сумма + дата), не меняя количество/цену актива. */
  addInvestmentPayout: (investmentId: string, amount: number, date: Date) => Promise<void>;
  editInvestmentPayout: (payoutId: string, amount: number, date: Date) => Promise<void>;
  removeInvestmentPayout: (payoutId: string) => Promise<void>;

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
  /** Банк начислил кэшбэк на карту — просто увеличивает накопленное, без движения кассы. */
  accrueCashback: (cardId: string, amount: number) => Promise<void>;
  /**
   * Обналичивание кэшбэка — уменьшает накопленное на карте и одной операцией добавляет
   * транзакцию-доход с категорией "Кэшбэк" на ту же сумму, чтобы деньги реально появились
   * в Доходах/Расходах, а не только числились накопленными на карте.
   */
  redeemCashback: (cardId: string, amount: number) => Promise<void>;

  unlockAchievement: (id: string) => Promise<void>;

  saveRecurringTemplate: (t: RecurringTemplate | Omit<RecurringTemplate, 'id'>) => Promise<void>;
  removeRecurringTemplate: (id: string) => Promise<void>;

  saveProfile: (p: UserProfile) => Promise<void>;

  resetAll: () => Promise<void>;

  /**
   * Записывает данные из распакованного JSON-бэкапа (см. utils/backup.ts) в базу и
   * перезагружает состояние из неё. Записи с уже существующим id обновляются, остальные —
   * добавляются, так что импорт можно безопасно повторять (не плодит дубликаты).
   */
  importBackup: (data: BackupData) => Promise<void>;

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
  savingsAccounts: [],
  savingsAccruals: [],
  investments: [],
  investmentPayouts: [],
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
      transactions, goals, credits, creditRepayments, budgetLimits, regularPayments, deposits,
      savingsAccounts, savingsAccruals, investments, investmentPayouts,
      friendDebts, insurancePolicies, wishlistItems, notifications, cashbackCards, achievements,
      recurringTemplates, profile,
    ] = await Promise.all([
      repo.listTransactions(), repo.listGoals(), repo.listCredits(), repo.listCreditRepayments(), repo.listBudgetLimits(),
      repo.listRegularPayments(), repo.listDeposits(), repo.listSavingsAccounts(), repo.listSavingsAccruals(),
      repo.listInvestments(), repo.listInvestmentPayouts(),
      repo.listFriendDebts(), repo.listInsurancePolicies(), repo.listWishlistItems(),
      repo.listNotifications(), repo.listCashbackCards(), repo.listAchievements(),
      repo.listRecurringTemplates(), repo.getUserProfile(),
    ]);
    set({
      transactions, goals, credits, creditRepayments, budgetLimits, regularPayments, deposits,
      savingsAccounts, savingsAccruals, investments, investmentPayouts,
      friendDebts, insurancePolicies, wishlistItems, notifications, cashbackCards, achievements,
      recurringTemplates, profile, isLoaded: true,
    });
    await get().accrueSavingsInterest();
    // Достижения, добавленные в ACHIEVEMENT_DEFINITIONS уже после того, как пользователь
    // прошёл разовое сидирование демо-данных, иначе никогда бы у него не появились —
    // сидирование запускается только один раз за всё время. Довносим недостающие по title.
    const missingDefs = ACHIEVEMENT_DEFINITIONS.filter(
      (def) => !get().achievements.some((a) => a.title === def.title)
    );
    if (missingDefs.length > 0) {
      const newAchievements: Achievement[] = missingDefs.map((def) => ({
        id: generateId(),
        title: def.title,
        description: def.description,
        isUnlocked: false,
      }));
      for (const a of newAchievements) await repo.upsertAchievement(a);
      set((state) => ({ achievements: [...state.achievements, ...newAchievements] }));
    }
    await get().checkAndUnlockAchievements();
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

    const principalPortion = Math.min(amount, credit.remaining);
    const remaining = Math.max(credit.remaining - amount, 0);
    const isFull = remaining <= 0;
    const updatedCredit: Credit = { ...credit, remaining };
    await repo.upsertCredit(updatedCredit);

    // Платёж списывается с текущего остатка автоматически — иначе пришлось бы вручную
    // дублировать его отдельной записью в Доходах/Расходах, легко забыть или разойтись в сумме.
    const transaction: Transaction = {
      id: generateId(),
      amount,
      category: credit.kind === 'mortgage' ? 'Ипотека' : 'Кредит',
      type: 'expense',
      date,
      comment: `Досрочное погашение: ${credit.name}`,
      currency: credit.currency,
    };
    await repo.insertTransaction(transaction);

    const repayment: CreditRepayment = {
      id: generateId(),
      creditId,
      date,
      amount,
      type: isFull ? 'full' : 'partial',
      principalPortion,
      transactionId: transaction.id,
    };
    await repo.insertCreditRepayment(repayment);

    set((state) => ({
      credits: state.credits.map((c) => (c.id === creditId ? updatedCredit : c)),
      creditRepayments: [repayment, ...state.creditRepayments],
      transactions: [transaction, ...state.transactions],
    }));
    await get().checkAndUnlockAchievements();
  },

  makePayment: async (creditId, amount, date) => {
    const credit = get().credits.find((c) => c.id === creditId);
    if (!credit || amount <= 0) return;

    const { newRemaining, principalPortion } = calculateAmortizationStep(credit.remaining, credit.rate, amount);
    const isFull = newRemaining <= 0;

    const nextPaymentDate = new Date(credit.nextPaymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const updatedCredit: Credit = { ...credit, remaining: newRemaining, nextPaymentDate };
    await repo.upsertCredit(updatedCredit);

    // Платёж списывается с текущего остатка автоматически — иначе пришлось бы вручную
    // дублировать его отдельной записью в Доходах/Расходах, легко забыть или разойтись в сумме.
    const transaction: Transaction = {
      id: generateId(),
      amount,
      category: credit.kind === 'mortgage' ? 'Ипотека' : 'Кредит',
      type: 'expense',
      date,
      comment: `Платёж: ${credit.name}`,
      currency: credit.currency,
    };
    await repo.insertTransaction(transaction);

    const repayment: CreditRepayment = {
      id: generateId(),
      creditId,
      date,
      amount,
      type: isFull ? 'full' : 'regular',
      principalPortion,
      transactionId: transaction.id,
    };
    await repo.insertCreditRepayment(repayment);

    set((state) => ({
      credits: state.credits.map((c) => (c.id === creditId ? updatedCredit : c)),
      creditRepayments: [repayment, ...state.creditRepayments],
      transactions: [transaction, ...state.transactions],
    }));
    await get().checkAndUnlockAchievements();
  },

  editCreditRepayment: async (repaymentId, amount, date) => {
    const repayment = get().creditRepayments.find((r) => r.id === repaymentId);
    if (!repayment || amount <= 0) return;
    const credit = get().credits.find((c) => c.id === repayment.creditId);
    if (!credit) return;

    // Сначала "откатываем" старое влияние этой записи на остаток, затем применяем новое —
    // так остаток по кредиту остаётся ровно суммой исходного остатка минус доли основного
    // долга по всем записям истории, независимо от того, какая именно запись редактируется.
    const remainingBeforeThisRepayment = credit.remaining + repayment.principalPortion;

    let principalPortion: number;
    let newRemaining: number;
    if (repayment.type === 'regular') {
      const step = calculateAmortizationStep(remainingBeforeThisRepayment, credit.rate, amount);
      principalPortion = step.principalPortion;
      newRemaining = step.newRemaining;
    } else {
      principalPortion = Math.min(amount, remainingBeforeThisRepayment);
      newRemaining = Math.max(remainingBeforeThisRepayment - amount, 0);
    }
    const isFull = newRemaining <= 0;
    const type = isFull ? 'full' : repayment.type === 'regular' ? 'regular' : 'partial';

    const updatedCredit: Credit = { ...credit, remaining: newRemaining };
    const updatedRepayment: CreditRepayment = { ...repayment, amount, date, type, principalPortion };
    await repo.upsertCredit(updatedCredit);
    await repo.updateCreditRepayment(updatedRepayment);

    // Держим связанную транзакцию-расход в согласии с суммой/датой платежа — иначе после
    // редактирования погашения "Остаток ДС" продолжал бы отражать старую, уже неверную сумму.
    const linkedTransaction = repayment.transactionId
      ? get().transactions.find((t) => t.id === repayment.transactionId)
      : undefined;
    let updatedTransaction: Transaction | undefined;
    if (linkedTransaction) {
      updatedTransaction = { ...linkedTransaction, amount, date };
      await repo.updateTransaction(updatedTransaction);
    }

    set((state) => ({
      credits: state.credits.map((c) => (c.id === credit.id ? updatedCredit : c)),
      creditRepayments: state.creditRepayments.map((r) => (r.id === repaymentId ? updatedRepayment : r)),
      transactions: updatedTransaction
        ? state.transactions.map((t) => (t.id === updatedTransaction!.id ? updatedTransaction! : t))
        : state.transactions,
    }));
  },

  removeCreditRepayment: async (repaymentId) => {
    const repayment = get().creditRepayments.find((r) => r.id === repaymentId);
    if (!repayment) return;
    const credit = get().credits.find((c) => c.id === repayment.creditId);
    if (!credit) return;

    const remaining = Math.min(credit.remaining + repayment.principalPortion, credit.amount);
    const updatedCredit: Credit = { ...credit, remaining };
    await repo.upsertCredit(updatedCredit);
    await repo.deleteCreditRepayment(repaymentId);
    // Связанная транзакция-расход удаляется вместе с записью погашения — иначе в Доходах/
    // Расходах осталась бы "осиротевшая" запись без соответствующего платежа по кредиту.
    if (repayment.transactionId) await repo.deleteTransaction(repayment.transactionId);

    set((state) => ({
      credits: state.credits.map((c) => (c.id === credit.id ? updatedCredit : c)),
      creditRepayments: state.creditRepayments.filter((r) => r.id !== repaymentId),
      transactions: repayment.transactionId
        ? state.transactions.filter((t) => t.id !== repayment.transactionId)
        : state.transactions,
    }));
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

  saveSavingsAccount: async (a) => {
    const account: SavingsAccount = 'id' in a ? a : { id: generateId(), ...a };
    await repo.upsertSavingsAccount(account);
    set((state) => ({
      savingsAccounts: state.savingsAccounts.some((x) => x.id === account.id)
        ? state.savingsAccounts.map((x) => (x.id === account.id ? account : x))
        : [...state.savingsAccounts, account],
    }));
  },
  removeSavingsAccount: async (id) => {
    await repo.deleteSavingsAccount(id);
    set((state) => ({
      savingsAccounts: state.savingsAccounts.filter((a) => a.id !== id),
      savingsAccruals: state.savingsAccruals.filter((a) => a.accountId !== id),
    }));
  },

  accrueSavingsInterest: async () => {
    const now = new Date();
    const accounts = get().savingsAccounts;
    const updatedAccounts: SavingsAccount[] = [];
    const newAccruals: SavingsAccrual[] = [];

    for (const account of accounts) {
      const elapsed = monthsElapsed(account.lastAccrualDate, now);
      if (elapsed <= 0) {
        updatedAccounts.push(account);
        continue;
      }
      let balance = account.balance;
      let accrualDate = new Date(account.lastAccrualDate);
      for (let i = 0; i < elapsed; i++) {
        accrualDate = new Date(accrualDate.getFullYear(), accrualDate.getMonth() + 1, accrualDate.getDate());
        const interest = calculateMonthlyInterest(balance, account.rate);
        if (interest > 0) {
          balance += interest;
          newAccruals.push({ id: generateId(), accountId: account.id, date: accrualDate, amount: interest });
        }
      }
      const updated: SavingsAccount = { ...account, balance, lastAccrualDate: accrualDate };
      updatedAccounts.push(updated);
      await repo.upsertSavingsAccount(updated);
    }

    if (newAccruals.length === 0) return;
    for (const accrual of newAccruals) await repo.insertSavingsAccrual(accrual);

    set((state) => ({
      savingsAccounts: updatedAccounts,
      savingsAccruals: [...newAccruals, ...state.savingsAccruals],
    }));
  },

  transferSavingsAccountToCash: async (accountId, amount) => {
    const account = get().savingsAccounts.find((a) => a.id === accountId);
    // Проверка на превышение баланса — на экране, откуда вызывается это действие
    // (сумма ≤ остатка); здесь просто не даём остатку уйти в минус, даже если что-то
    // передадут напрямую в обход экрана.
    if (!account || amount <= 0 || amount > account.balance) return;

    const updatedAccount: SavingsAccount = { ...account, balance: account.balance - amount };
    const transaction: Transaction = {
      id: generateId(),
      amount,
      category: 'Перевод со счёта',
      type: 'income',
      date: new Date(),
      comment: `Перевод с накопительного счёта «${account.name}»`,
      currency: account.currency,
    };
    await repo.upsertSavingsAccount(updatedAccount);
    await repo.insertTransaction(transaction);
    set((state) => ({
      savingsAccounts: state.savingsAccounts.map((a) => (a.id === accountId ? updatedAccount : a)),
      transactions: [transaction, ...state.transactions],
    }));
  },

  depositToSavingsAccountFromCash: async (accountId, amount) => {
    const account = get().savingsAccounts.find((a) => a.id === accountId);
    // Не превышает ли пополнение доступный кассовый остаток — проверяется на экране (там
    // есть конвертация валют для сравнения с "Остаток ДС"); здесь просто отсекаем некорректную
    // сумму, даже если что-то передадут напрямую в обход экрана.
    if (!account || amount <= 0) return;

    const updatedAccount: SavingsAccount = { ...account, balance: account.balance + amount };
    const transaction: Transaction = {
      id: generateId(),
      amount,
      category: 'Перевод на счёт',
      type: 'expense',
      date: new Date(),
      comment: `Пополнение накопительного счёта «${account.name}»`,
      currency: account.currency,
    };
    await repo.upsertSavingsAccount(updatedAccount);
    await repo.insertTransaction(transaction);
    set((state) => ({
      savingsAccounts: state.savingsAccounts.map((a) => (a.id === accountId ? updatedAccount : a)),
      transactions: [transaction, ...state.transactions],
    }));
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
    set((state) => ({
      investments: state.investments.filter((i) => i.id !== id),
      investmentPayouts: state.investmentPayouts.filter((p) => p.investmentId !== id),
    }));
  },

  addInvestmentPayout: async (investmentId, amount, date) => {
    if (amount <= 0) return;
    const investment = get().investments.find((i) => i.id === investmentId);
    const payout: InvestmentPayout = { id: generateId(), investmentId, date, amount };

    // Выплата зачисляется сразу как доход в Доходах/Расходах — деньги реально приходят на
    // счёт, а раньше это нигде не отражалось, кроме истории выплат по конкретному активу.
    if (investment) {
      const transaction: Transaction = {
        id: generateId(),
        amount,
        category: 'Инвестиции',
        type: 'income',
        date,
        comment: `Выплата по активу «${investment.name}»`,
        currency: investment.currency,
      };
      payout.transactionId = transaction.id;
      await repo.insertTransaction(transaction);
      await repo.insertInvestmentPayout(payout);
      set((state) => ({
        investmentPayouts: [payout, ...state.investmentPayouts],
        transactions: [transaction, ...state.transactions],
      }));
      await get().checkAndUnlockAchievements();
      return;
    }

    await repo.insertInvestmentPayout(payout);
    set((state) => ({ investmentPayouts: [payout, ...state.investmentPayouts] }));
  },
  editInvestmentPayout: async (payoutId, amount, date) => {
    if (amount <= 0) return;
    const existing = get().investmentPayouts.find((p) => p.id === payoutId);
    if (!existing) return;
    const updated: InvestmentPayout = { ...existing, amount, date };
    await repo.updateInvestmentPayout(updated);

    const linkedTransaction = existing.transactionId
      ? get().transactions.find((t) => t.id === existing.transactionId)
      : undefined;
    let updatedTransaction: Transaction | undefined;
    if (linkedTransaction) {
      updatedTransaction = { ...linkedTransaction, amount, date };
      await repo.updateTransaction(updatedTransaction);
    }

    set((state) => ({
      investmentPayouts: state.investmentPayouts.map((p) => (p.id === payoutId ? updated : p)),
      transactions: updatedTransaction
        ? state.transactions.map((t) => (t.id === updatedTransaction!.id ? updatedTransaction! : t))
        : state.transactions,
    }));
  },
  removeInvestmentPayout: async (payoutId) => {
    const existing = get().investmentPayouts.find((p) => p.id === payoutId);
    await repo.deleteInvestmentPayout(payoutId);
    if (existing?.transactionId) await repo.deleteTransaction(existing.transactionId);
    set((state) => ({
      investmentPayouts: state.investmentPayouts.filter((p) => p.id !== payoutId),
      transactions: existing?.transactionId
        ? state.transactions.filter((t) => t.id !== existing.transactionId)
        : state.transactions,
    }));
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

  accrueCashback: async (cardId, amount) => {
    const card = get().cashbackCards.find((c) => c.id === cardId);
    if (!card || amount <= 0) return;
    const updated: CashbackCard = { ...card, accumulated: card.accumulated + amount };
    await repo.upsertCashbackCard(updated);
    set((state) => ({ cashbackCards: state.cashbackCards.map((c) => (c.id === cardId ? updated : c)) }));
  },

  redeemCashback: async (cardId, amount) => {
    const card = get().cashbackCards.find((c) => c.id === cardId);
    // Обналичить можно не больше, чем реально накоплено на карте — иначе накопленное ушло бы в минус.
    if (!card || amount <= 0 || amount > card.accumulated) return;

    const updatedCard: CashbackCard = { ...card, accumulated: card.accumulated - amount };
    const transaction: Transaction = {
      id: generateId(),
      amount,
      category: 'Кэшбэк',
      type: 'income',
      date: new Date(),
      comment: `Обналичен кэшбэк с карты «${card.name}»`,
      currency: useSettingsStore.getState().currency,
    };
    await repo.upsertCashbackCard(updatedCard);
    await repo.insertTransaction(transaction);
    set((state) => ({
      cashbackCards: state.cashbackCards.map((c) => (c.id === cardId ? updatedCard : c)),
      transactions: [transaction, ...state.transactions],
    }));
    await get().checkAndUnlockAchievements();
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
      deposits: [], savingsAccounts: [], savingsAccruals: [], investments: [], investmentPayouts: [], friendDebts: [], insurancePolicies: [], wishlistItems: [],
      notifications: [], cashbackCards: [], achievements: [], recurringTemplates: [], profile: null,
      isLoaded: false,
    });
  },

  importBackup: async (data) => {
    // Записи бэкапа приходят с уже существующими id (это те же id, что были в БД на момент
    // экспорта). Часть таблиц не имеет upsert-обёртки (только insert/update отдельно) — для них
    // сначала пробуем insert, а если id уже занят (UNIQUE constraint), откатываемся на update.
    const insertOrUpdate = async <T extends { id: string }>(
      items: T[] | undefined,
      insert: (item: T) => Promise<void>,
      update: (item: T) => Promise<void>
    ) => {
      if (!items) return;
      for (const item of items) {
        try {
          await insert(item);
        } catch {
          await update(item);
        }
      }
    };

    if (data.transactions) await insertOrUpdate(data.transactions, repo.insertTransaction, repo.updateTransaction);
    if (data.goals) for (const g of data.goals) await repo.upsertGoal(g);
    if (data.credits) for (const c of data.credits) await repo.upsertCredit(c);
    if (data.creditRepayments) {
      await insertOrUpdate(data.creditRepayments, repo.insertCreditRepayment, repo.updateCreditRepayment);
    }
    if (data.budgetLimits) for (const b of data.budgetLimits) await repo.upsertBudgetLimit(b);
    if (data.regularPayments) for (const p of data.regularPayments) await repo.upsertRegularPayment(p);
    if (data.deposits) for (const d of data.deposits) await repo.upsertDeposit(d);
    if (data.savingsAccounts) for (const a of data.savingsAccounts) await repo.upsertSavingsAccount(a);
    if (data.savingsAccruals) {
      // Начисления не редактируются после создания — при совпадении id повторную запись просто пропускаем.
      for (const a of data.savingsAccruals) {
        try {
          await repo.insertSavingsAccrual(a);
        } catch {
          // уже импортировано ранее — пропускаем
        }
      }
    }
    if (data.investments) for (const i of data.investments) await repo.upsertInvestment(i);
    if (data.investmentPayouts) {
      await insertOrUpdate(data.investmentPayouts, repo.insertInvestmentPayout, repo.updateInvestmentPayout);
    }
    if (data.friendDebts) for (const d of data.friendDebts) await repo.upsertFriendDebt(d);
    if (data.insurancePolicies) for (const p of data.insurancePolicies) await repo.upsertInsurancePolicy(p);
    if (data.wishlistItems) for (const w of data.wishlistItems) await repo.upsertWishlistItem(w);
    if (data.notifications) {
      // У уведомлений нет update-обёртки (только markRead/markAllRead) — при совпадении id
      // повторную запись просто пропускаем, как и с начислениями по накопительным счетам.
      for (const n of data.notifications) {
        try {
          await repo.insertNotification(n);
        } catch {
          // уже импортировано ранее — пропускаем
        }
      }
    }
    if (data.cashbackCards) for (const c of data.cashbackCards) await repo.upsertCashbackCard(c);
    if (data.achievements) for (const a of data.achievements) await repo.upsertAchievement(a);
    if (data.recurringTemplates) for (const t of data.recurringTemplates) await repo.upsertRecurringTemplate(t);
    if (data.profile) await repo.upsertUserProfile(data.profile);

    await get().loadAll();
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
    const earlyRepayment = findByTitle('Досрочное погашение');
    if (earlyRepayment && !earlyRepayment.isUnlocked && state.creditRepayments.some((r) => r.type === 'partial')) {
      await get().unlockAchievement(earlyRepayment.id);
    }
    // "Все платежи под контролем" — для каждого активного регулярного платежа должна найтись
    // хотя бы одна транзакция, отмеченная через "Отметить оплаченным"/"Отметить получено"
    // (совпадение по категории/типу/сумме/названию — то же самое условие, что и проверка на
    // повторную отметку в том же месяце на самом экране регулярных платежей).
    const allPaymentsTracked = findByTitle('Все платежи под контролем');
    const activeRegularPayments = state.regularPayments.filter((p) => p.isActive);
    if (
      allPaymentsTracked &&
      !allPaymentsTracked.isUnlocked &&
      activeRegularPayments.length > 0 &&
      activeRegularPayments.every((p) =>
        state.transactions.some(
          (t) => t.category === p.category && t.type === p.type && t.amount === p.amount && t.comment === p.name
        )
      )
    ) {
      await get().unlockAchievement(allPaymentsTracked.id);
    }
    const cashbackUsed = findByTitle('Кэшбэк в дело');
    if (
      cashbackUsed &&
      !cashbackUsed.isUnlocked &&
      state.transactions.some((t) => t.category === 'Кэшбэк' && t.type === 'income')
    ) {
      await get().unlockAchievement(cashbackUsed.id);
    }
    const firstPayout = findByTitle('Первая выплата по инвестициям');
    if (firstPayout && !firstPayout.isUnlocked && state.investmentPayouts.length >= 1) {
      await get().unlockAchievement(firstPayout.id);
    }
  },
}));
