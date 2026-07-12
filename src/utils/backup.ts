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
  CashbackCard,
  Achievement,
  RecurringTemplate,
  UserProfile,
} from '../types';

// Полный снимок всех финансовых данных приложения — используется и для экспорта (кнопка
// "Экспорт JSON"), и для импорта обратно (кнопка "Импорт из файла"). Все поля необязательные,
// чтобы старый формат экспорта (только транзакции/цели/кредиты/лимиты) и файлы с неполным
// набором данных всё равно импортировались частично, а не отклонялись целиком.
export interface BackupData {
  transactions?: Transaction[];
  goals?: Goal[];
  credits?: Credit[];
  creditRepayments?: CreditRepayment[];
  budgetLimits?: BudgetLimit[];
  regularPayments?: RegularPayment[];
  deposits?: Deposit[];
  savingsAccounts?: SavingsAccount[];
  savingsAccruals?: SavingsAccrual[];
  investments?: Investment[];
  investmentPayouts?: InvestmentPayout[];
  friendDebts?: FriendDebt[];
  insurancePolicies?: InsurancePolicy[];
  wishlistItems?: WishlistItem[];
  cashbackCards?: CashbackCard[];
  achievements?: Achievement[];
  recurringTemplates?: RecurringTemplate[];
  profile?: UserProfile;
}

function reviveDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function reviveArray<T>(value: unknown, revive: (raw: any) => T): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(revive);
}

// JSON.parse возвращает даты как обычные строки (ISO-8601, т.к. JSON.stringify(date) уже
// сериализует их так) — эта функция превращает распарсенный JSON обратно в BackupData с
// настоящими Date-полями, точно так же, как это делает каждый rowTo* в database/repository.ts
// при чтении из SQLite.
export function reviveBackupData(raw: unknown): BackupData {
  if (typeof raw !== 'object' || raw === null) return {};
  const data = raw as Record<string, unknown>;

  return {
    transactions: reviveArray<Transaction>(data.transactions, (t) => ({ ...t, date: reviveDate(t.date) ?? new Date() })),
    goals: reviveArray<Goal>(data.goals, (g) => ({ ...g, deadline: reviveDate(g.deadline) ?? new Date() })),
    credits: reviveArray<Credit>(data.credits, (c) => ({
      ...c,
      nextPaymentDate: reviveDate(c.nextPaymentDate) ?? new Date(),
      startDate: reviveDate(c.startDate) ?? new Date(),
      currency: c.currency ?? 'RUB',
    })),
    creditRepayments: reviveArray<CreditRepayment>(data.creditRepayments, (r) => ({
      ...r,
      date: reviveDate(r.date) ?? new Date(),
      principalPortion: r.principalPortion ?? r.amount,
    })),
    budgetLimits: reviveArray<BudgetLimit>(data.budgetLimits, (l) => ({ ...l })),
    regularPayments: reviveArray<RegularPayment>(data.regularPayments, (p) => ({ ...p })),
    deposits: reviveArray<Deposit>(data.deposits, (d) => ({
      ...d,
      openDate: reviveDate(d.openDate) ?? new Date(),
      closeDate: reviveDate(d.closeDate) ?? new Date(),
      currency: d.currency ?? 'RUB',
    })),
    savingsAccounts: reviveArray<SavingsAccount>(data.savingsAccounts, (a) => ({
      ...a,
      lastAccrualDate: reviveDate(a.lastAccrualDate) ?? new Date(),
      currency: a.currency ?? 'RUB',
    })),
    savingsAccruals: reviveArray<SavingsAccrual>(data.savingsAccruals, (a) => ({ ...a, date: reviveDate(a.date) ?? new Date() })),
    investments: reviveArray<Investment>(data.investments, (i) => ({ ...i, currency: i.currency ?? 'RUB' })),
    investmentPayouts: reviveArray<InvestmentPayout>(data.investmentPayouts, (p) => ({
      ...p,
      date: reviveDate(p.date) ?? new Date(),
    })),
    friendDebts: reviveArray<FriendDebt>(data.friendDebts, (d) => ({
      ...d,
      reminderDate: reviveDate(d.reminderDate),
    })),
    insurancePolicies: reviveArray<InsurancePolicy>(data.insurancePolicies, (p) => ({
      ...p,
      endDate: reviveDate(p.endDate) ?? new Date(),
      paymentFrequency: p.paymentFrequency ?? 'annual',
    })),
    wishlistItems: reviveArray<WishlistItem>(data.wishlistItems, (w) => ({ ...w })),
    cashbackCards: reviveArray<CashbackCard>(data.cashbackCards, (c) => ({ ...c })),
    achievements: reviveArray<Achievement>(data.achievements, (a) => ({
      ...a,
      unlockedDate: reviveDate(a.unlockedDate),
    })),
    recurringTemplates: reviveArray<RecurringTemplate>(data.recurringTemplates, (t) => ({ ...t })),
    profile:
      typeof data.profile === 'object' && data.profile !== null
        ? { ...(data.profile as UserProfile), registeredAt: reviveDate((data.profile as any).registeredAt) ?? new Date() }
        : undefined,
  };
}

// Сколько записей реально распознано в файле бэкапа — используется для сообщения пользователю
// после импорта ("Импортировано: 42 транзакции, 3 кредита...").
export function countBackupEntries(data: BackupData): number {
  return Object.values(data).reduce((sum, value) => (Array.isArray(value) ? sum + value.length : sum + (value ? 1 : 0)), 0);
}
