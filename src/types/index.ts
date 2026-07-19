export type Currency = 'RUB' | 'USD' | 'EUR';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: Date;
  comment?: string;
  currency: Currency;
  createdBy?: string;
}

export type GoalPriority = 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: Date;
  priority: GoalPriority;
  isShared?: boolean;
  partnerName?: string;
  partnerSavedAmount?: number;
}

export type CreditKind = 'credit' | 'mortgage';

export interface Credit {
  id: string;
  kind: CreditKind;
  name: string;
  amount: number;
  rate: number;
  termMonths: number;
  monthlyPayment: number;
  remaining: number;
  nextPaymentDate: Date;
  /** Дата выдачи кредита. */
  startDate: Date;
  /** Валюта, в которой указаны все денежные поля этого кредита (amount, remaining, ...). */
  currency: Currency;
  /** Только для kind === 'mortgage'. */
  propertyAddress?: string;
  /** Только для kind === 'mortgage'. */
  downPayment?: number;
  /** Только для kind === 'mortgage'. Текущая рыночная стоимость объекта — для расчёта чистой прибыли. */
  currentValue?: number;
  /** Только для kind === 'mortgage'. Накопленные расходы на ремонт объекта. */
  renovationCosts?: number;
}

export type CreditRepaymentType = 'regular' | 'partial' | 'full';

export interface CreditRepayment {
  id: string;
  creditId: string;
  date: Date;
  amount: number;
  type: CreditRepaymentType;
  /** Сколько из этой суммы реально ушло в счёт основного долга (остальное — проценты). */
  principalPortion: number;
  /** Связанная транзакция-расход в Доходах/Расходах — платёж списывается с текущего
   * остатка автоматически вместе с записью погашения. */
  transactionId?: string;
}

export type BudgetPeriod = 'month' | 'quarter' | 'year';

export interface BudgetLimit {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: BudgetPeriod;
}

export interface RegularPayment {
  id: string;
  name: string;
  amount: number;
  category: string;
  /** День оплаты — для платежей с фиксированной датой (интернет) единственная дата;
   * для платежей с окном оплаты (например ЖКХ — с 1 по 10 число) начало окна. */
  dayOfMonth: number;
  /** Если задано — платёж можно вносить в любой день от `dayOfMonth` до этого числа
   * включительно (окно оплаты), а не строго в один день. */
  dayOfMonthEnd?: number;
  isActive: boolean;
  type: TransactionType;
}

export interface Deposit {
  id: string;
  name: string;
  amount: number;
  rate: number;
  openDate: Date;
  closeDate: Date;
  currency: Currency;
}

// В отличие от Deposit (вклад с фиксированным сроком), у накопительного счёта нет даты
// закрытия — остаток можно пополнять/снимать, а проценты начисляются на текущий остаток
// в конце каждого календарного месяца.
export interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  /** Годовая процентная ставка, % — начисляется на остаток помесячно. */
  rate: number;
  /** Дата, по которую проценты уже начислены (изначально — дата открытия счёта). */
  lastAccrualDate: Date;
  currency: Currency;
}

export interface SavingsAccrual {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
}

export type AssetType = 'stock' | 'bond' | 'crypto' | 'fund';

export interface Investment {
  id: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
  /** Тикер на Мосбирже (например SBER) — если задан, «Текущая цена» можно подтянуть автоматически. */
  moexTicker?: string;
}

// Дивиденды (для акций) или купоны (для облигаций) — тип выплаты не хранится отдельно,
// а определяется по assetType актива на экране, чтобы не дублировать классификацию.
export interface InvestmentPayout {
  id: string;
  investmentId: string;
  date: Date;
  amount: number;
}

export type DebtStatus = 'owed_to_me' | 'i_owe';

export interface FriendDebt {
  id: string;
  personName: string;
  amount: number;
  status: DebtStatus;
  isPaid: boolean;
  reminderDate?: Date;
}

export type InsurancePaymentFrequency = 'monthly' | 'annual';

export interface InsurancePolicy {
  id: string;
  type: string;
  insurer: string;
  amount: number;
  endDate: Date;
  /** Если полис оформлен по конкретному кредиту/ипотеке (страхование жизни/объекта) — id кредита. */
  creditId?: string;
  /**
   * Как часто вносится взнос: ежегодно (обычная схема — ОСАГО/КАСКО, а также большинство
   * ипотечного страхования жизни/объекта) или ежемесячно (реже, для полисов с помесячной
   * оплатой) — определяет, как планируется напоминание: ежегодно за 30 дней до endDate
   * или ежемесячно повторяющееся.
   */
  paymentFrequency: InsurancePaymentFrequency;
}

export type WishStatus = 'postponed' | 'buying_soon' | 'fulfilled';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  priority: GoalPriority;
  status: WishStatus;
  savedAmount: number;
}

export type NotificationType = 'payment' | 'limit' | 'goal' | 'report' | 'debt';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  relatedScreen?: string;
  relatedId?: string;
}

export interface CashbackCard {
  id: string;
  name: string;
  cashbackPercent: number;
  accumulated: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  unlockedDate?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUri?: string;
  registeredAt: Date;
}

export type ThemeScheme = 'blue' | 'maroon' | 'green' | 'purple';

export type AuthMethod = 'pin' | 'password' | 'biometric';

export interface RecurringTemplate {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: TransactionType;
  everyDay: number;
}
