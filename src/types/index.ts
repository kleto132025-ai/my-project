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
  /** Только для kind === 'mortgage'. */
  propertyAddress?: string;
  /** Только для kind === 'mortgage'. */
  downPayment?: number;
}

export type CreditRepaymentType = 'partial' | 'full';

export interface CreditRepayment {
  id: string;
  creditId: string;
  date: Date;
  amount: number;
  type: CreditRepaymentType;
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
  dayOfMonth: number;
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
}

export type AssetType = 'stock' | 'bond' | 'crypto' | 'fund';

export interface Investment {
  id: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
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

export interface InsurancePolicy {
  id: string;
  type: string;
  insurer: string;
  amount: number;
  endDate: Date;
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
