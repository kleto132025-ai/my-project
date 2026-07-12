import { getDb } from './client';
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

// ---------- Transactions ----------

type TransactionRow = Omit<Transaction, 'date'> & { date: string };

function rowToTransaction(row: TransactionRow): Transaction {
  return { ...row, date: new Date(row.date) };
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TransactionRow>(
    'SELECT * FROM transactions ORDER BY date DESC;'
  );
  return rows.map(rowToTransaction);
}

export async function insertTransaction(t: Transaction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO transactions (id, amount, category, type, date, comment, currency, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [t.id, t.amount, t.category, t.type, t.date.toISOString(), t.comment ?? null, t.currency, t.createdBy ?? null]
  );
}

export async function updateTransaction(t: Transaction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET amount = ?, category = ?, type = ?, date = ?, comment = ?, currency = ?, createdBy = ?
     WHERE id = ?;`,
    [t.amount, t.category, t.type, t.date.toISOString(), t.comment ?? null, t.currency, t.createdBy ?? null, t.id]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
}

// ---------- Goals ----------

type GoalRow = Omit<Goal, 'deadline' | 'isShared'> & { deadline: string; isShared: number };

function rowToGoal(row: GoalRow): Goal {
  return { ...row, deadline: new Date(row.deadline), isShared: !!row.isShared };
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY deadline ASC;');
  return rows.map(rowToGoal);
}

export async function upsertGoal(g: Goal): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO goals (id, name, targetAmount, savedAmount, deadline, priority, isShared, partnerName, partnerSavedAmount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, targetAmount=excluded.targetAmount,
       savedAmount=excluded.savedAmount, deadline=excluded.deadline, priority=excluded.priority,
       isShared=excluded.isShared, partnerName=excluded.partnerName, partnerSavedAmount=excluded.partnerSavedAmount;`,
    [
      g.id,
      g.name,
      g.targetAmount,
      g.savedAmount,
      g.deadline.toISOString(),
      g.priority,
      g.isShared ? 1 : 0,
      g.partnerName ?? null,
      g.partnerSavedAmount ?? null,
    ]
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?;', [id]);
}

// ---------- Credits ----------

type CreditRow = Omit<Credit, 'nextPaymentDate' | 'startDate'> & {
  nextPaymentDate: string;
  startDate: string;
};

function rowToCredit(row: CreditRow): Credit {
  return { ...row, nextPaymentDate: new Date(row.nextPaymentDate), startDate: new Date(row.startDate) };
}

export async function listCredits(): Promise<Credit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CreditRow>('SELECT * FROM credits ORDER BY nextPaymentDate ASC;');
  return rows.map(rowToCredit);
}

export async function upsertCredit(c: Credit): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO credits (id, kind, name, amount, rate, termMonths, monthlyPayment, remaining, nextPaymentDate, startDate, propertyAddress, downPayment, currentValue, renovationCosts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, name=excluded.name, amount=excluded.amount, rate=excluded.rate,
       termMonths=excluded.termMonths, monthlyPayment=excluded.monthlyPayment, remaining=excluded.remaining,
       nextPaymentDate=excluded.nextPaymentDate, startDate=excluded.startDate,
       propertyAddress=excluded.propertyAddress, downPayment=excluded.downPayment,
       currentValue=excluded.currentValue, renovationCosts=excluded.renovationCosts;`,
    [
      c.id,
      c.kind,
      c.name,
      c.amount,
      c.rate,
      c.termMonths,
      c.monthlyPayment,
      c.remaining,
      c.nextPaymentDate.toISOString(),
      c.startDate.toISOString(),
      c.propertyAddress ?? null,
      c.downPayment ?? null,
      c.currentValue ?? null,
      c.renovationCosts ?? null,
    ]
  );
}

export async function deleteCredit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM credits WHERE id = ?;', [id]);
  await db.runAsync('DELETE FROM credit_repayments WHERE creditId = ?;', [id]);
}

// ---------- Credit repayments ----------

type CreditRepaymentRow = Omit<CreditRepayment, 'date' | 'principalPortion'> & {
  date: string;
  principalPortion: number | null;
};

export async function listCreditRepayments(): Promise<CreditRepayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CreditRepaymentRow>(
    'SELECT * FROM credit_repayments ORDER BY date DESC;'
  );
  // principalPortion может быть NULL у записей, сделанных до появления этой колонки —
  // для них вся сумма считалась досрочным погашением тела кредита, так что amount и есть
  // фактический разбор на основной долг.
  return rows.map((r) => ({ ...r, date: new Date(r.date), principalPortion: r.principalPortion ?? r.amount }));
}

export async function insertCreditRepayment(r: CreditRepayment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO credit_repayments (id, creditId, date, amount, type, principalPortion) VALUES (?, ?, ?, ?, ?, ?);`,
    [r.id, r.creditId, r.date.toISOString(), r.amount, r.type, r.principalPortion]
  );
}

export async function updateCreditRepayment(r: CreditRepayment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE credit_repayments SET date = ?, amount = ?, type = ?, principalPortion = ? WHERE id = ?;`,
    [r.date.toISOString(), r.amount, r.type, r.principalPortion, r.id]
  );
}

export async function deleteCreditRepayment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM credit_repayments WHERE id = ?;', [id]);
}

// ---------- Budget limits ----------

export async function listBudgetLimits(): Promise<BudgetLimit[]> {
  const db = await getDb();
  return db.getAllAsync<BudgetLimit>('SELECT id, category, "limit" as "limit", spent, period FROM budget_limits;');
}

export async function upsertBudgetLimit(b: BudgetLimit): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO budget_limits (id, category, "limit", spent, period)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET category=excluded.category, "limit"=excluded."limit",
       spent=excluded.spent, period=excluded.period;`,
    [b.id, b.category, b.limit, b.spent, b.period]
  );
}

export async function deleteBudgetLimit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM budget_limits WHERE id = ?;', [id]);
}

// ---------- Regular payments ----------

type RegularPaymentRow = Omit<RegularPayment, 'isActive'> & { isActive: number };

export async function listRegularPayments(): Promise<RegularPayment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RegularPaymentRow>('SELECT * FROM regular_payments;');
  return rows.map((r) => ({ ...r, isActive: !!r.isActive }));
}

export async function upsertRegularPayment(p: RegularPayment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO regular_payments (id, name, amount, category, dayOfMonth, isActive, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, amount=excluded.amount, category=excluded.category,
       dayOfMonth=excluded.dayOfMonth, isActive=excluded.isActive, type=excluded.type;`,
    [p.id, p.name, p.amount, p.category, p.dayOfMonth, p.isActive ? 1 : 0, p.type]
  );
}

export async function deleteRegularPayment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM regular_payments WHERE id = ?;', [id]);
}

// ---------- Deposits ----------

type DepositRow = Omit<Deposit, 'openDate' | 'closeDate'> & { openDate: string; closeDate: string };

export async function listDeposits(): Promise<Deposit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DepositRow>('SELECT * FROM deposits;');
  return rows.map((r) => ({ ...r, openDate: new Date(r.openDate), closeDate: new Date(r.closeDate) }));
}

export async function upsertDeposit(d: Deposit): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO deposits (id, name, amount, rate, openDate, closeDate)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, amount=excluded.amount, rate=excluded.rate,
       openDate=excluded.openDate, closeDate=excluded.closeDate;`,
    [d.id, d.name, d.amount, d.rate, d.openDate.toISOString(), d.closeDate.toISOString()]
  );
}

export async function deleteDeposit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM deposits WHERE id = ?;', [id]);
}

// ---------- Savings accounts ----------

type SavingsAccountRow = Omit<SavingsAccount, 'lastAccrualDate'> & { lastAccrualDate: string };

export async function listSavingsAccounts(): Promise<SavingsAccount[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavingsAccountRow>('SELECT * FROM savings_accounts;');
  return rows.map((r) => ({ ...r, lastAccrualDate: new Date(r.lastAccrualDate) }));
}

export async function upsertSavingsAccount(a: SavingsAccount): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO savings_accounts (id, name, balance, rate, lastAccrualDate)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, balance=excluded.balance, rate=excluded.rate,
       lastAccrualDate=excluded.lastAccrualDate;`,
    [a.id, a.name, a.balance, a.rate, a.lastAccrualDate.toISOString()]
  );
}

export async function deleteSavingsAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM savings_accounts WHERE id = ?;', [id]);
  await db.runAsync('DELETE FROM savings_accruals WHERE accountId = ?;', [id]);
}

type SavingsAccrualRow = Omit<SavingsAccrual, 'date'> & { date: string };

export async function listSavingsAccruals(): Promise<SavingsAccrual[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavingsAccrualRow>('SELECT * FROM savings_accruals ORDER BY date DESC;');
  return rows.map((r) => ({ ...r, date: new Date(r.date) }));
}

export async function insertSavingsAccrual(a: SavingsAccrual): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO savings_accruals (id, accountId, date, amount) VALUES (?, ?, ?, ?);`,
    [a.id, a.accountId, a.date.toISOString(), a.amount]
  );
}

// ---------- Investments ----------

export async function listInvestments(): Promise<Investment[]> {
  const db = await getDb();
  return db.getAllAsync<Investment>('SELECT * FROM investments;');
}

export async function upsertInvestment(i: Investment): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO investments (id, name, assetType, quantity, purchasePrice, currentPrice)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, assetType=excluded.assetType,
       quantity=excluded.quantity, purchasePrice=excluded.purchasePrice, currentPrice=excluded.currentPrice;`,
    [i.id, i.name, i.assetType, i.quantity, i.purchasePrice, i.currentPrice]
  );
}

export async function deleteInvestment(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM investments WHERE id = ?;', [id]);
  await db.runAsync('DELETE FROM investment_payouts WHERE investmentId = ?;', [id]);
}

// ---------- Investment payouts (дивиденды / купоны) ----------

type InvestmentPayoutRow = Omit<InvestmentPayout, 'date'> & { date: string };

export async function listInvestmentPayouts(): Promise<InvestmentPayout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<InvestmentPayoutRow>(
    'SELECT * FROM investment_payouts ORDER BY date DESC;'
  );
  return rows.map((r) => ({ ...r, date: new Date(r.date) }));
}

export async function insertInvestmentPayout(p: InvestmentPayout): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO investment_payouts (id, investmentId, date, amount) VALUES (?, ?, ?, ?);`,
    [p.id, p.investmentId, p.date.toISOString(), p.amount]
  );
}

export async function updateInvestmentPayout(p: InvestmentPayout): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE investment_payouts SET date = ?, amount = ? WHERE id = ?;`,
    [p.date.toISOString(), p.amount, p.id]
  );
}

export async function deleteInvestmentPayout(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM investment_payouts WHERE id = ?;', [id]);
}

// ---------- Friend debts ----------

type FriendDebtRow = Omit<FriendDebt, 'isPaid' | 'reminderDate'> & {
  isPaid: number;
  reminderDate: string | null;
};

export async function listFriendDebts(): Promise<FriendDebt[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FriendDebtRow>('SELECT * FROM friend_debts;');
  return rows.map((r) => ({
    ...r,
    isPaid: !!r.isPaid,
    reminderDate: r.reminderDate ? new Date(r.reminderDate) : undefined,
  }));
}

export async function upsertFriendDebt(d: FriendDebt): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO friend_debts (id, personName, amount, status, isPaid, reminderDate)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET personName=excluded.personName, amount=excluded.amount,
       status=excluded.status, isPaid=excluded.isPaid, reminderDate=excluded.reminderDate;`,
    [d.id, d.personName, d.amount, d.status, d.isPaid ? 1 : 0, d.reminderDate?.toISOString() ?? null]
  );
}

export async function deleteFriendDebt(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM friend_debts WHERE id = ?;', [id]);
}

// ---------- Insurance ----------

type InsuranceRow = Omit<InsurancePolicy, 'endDate' | 'creditId'> & { endDate: string; creditId: string | null };

export async function listInsurancePolicies(): Promise<InsurancePolicy[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<InsuranceRow>('SELECT * FROM insurance_policies;');
  return rows.map((r) => ({ ...r, endDate: new Date(r.endDate), creditId: r.creditId ?? undefined }));
}

export async function upsertInsurancePolicy(p: InsurancePolicy): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO insurance_policies (id, type, insurer, amount, endDate, creditId)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET type=excluded.type, insurer=excluded.insurer,
       amount=excluded.amount, endDate=excluded.endDate, creditId=excluded.creditId;`,
    [p.id, p.type, p.insurer, p.amount, p.endDate.toISOString(), p.creditId ?? null]
  );
}

export async function deleteInsurancePolicy(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM insurance_policies WHERE id = ?;', [id]);
}

// ---------- Wishlist ----------

export async function listWishlistItems(): Promise<WishlistItem[]> {
  const db = await getDb();
  return db.getAllAsync<WishlistItem>('SELECT * FROM wishlist_items;');
}

export async function upsertWishlistItem(w: WishlistItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO wishlist_items (id, name, price, priority, status, savedAmount)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price,
       priority=excluded.priority, status=excluded.status, savedAmount=excluded.savedAmount;`,
    [w.id, w.name, w.price, w.priority, w.status, w.savedAmount]
  );
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM wishlist_items WHERE id = ?;', [id]);
}

// ---------- Notifications ----------

type NotificationRow = Omit<AppNotification, 'date' | 'isRead'> & { date: string; isRead: number };

export async function listNotifications(): Promise<AppNotification[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NotificationRow>('SELECT * FROM notifications ORDER BY date DESC;');
  return rows.map((r) => ({ ...r, date: new Date(r.date), isRead: !!r.isRead }));
}

export async function insertNotification(n: AppNotification): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO notifications (id, type, title, message, date, isRead, relatedScreen, relatedId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [n.id, n.type, n.title, n.message, n.date.toISOString(), n.isRead ? 1 : 0, n.relatedScreen ?? null, n.relatedId ?? null]
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET isRead = 1 WHERE id = ?;', [id]);
}

export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notifications SET isRead = 1;');
}

export async function deleteNotification(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notifications WHERE id = ?;', [id]);
}

// ---------- Cashback cards ----------

export async function listCashbackCards(): Promise<CashbackCard[]> {
  const db = await getDb();
  return db.getAllAsync<CashbackCard>('SELECT * FROM cashback_cards;');
}

export async function upsertCashbackCard(c: CashbackCard): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO cashback_cards (id, name, cashbackPercent, accumulated)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, cashbackPercent=excluded.cashbackPercent,
       accumulated=excluded.accumulated;`,
    [c.id, c.name, c.cashbackPercent, c.accumulated]
  );
}

export async function deleteCashbackCard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cashback_cards WHERE id = ?;', [id]);
}

// ---------- Achievements ----------

type AchievementRow = Omit<Achievement, 'isUnlocked' | 'unlockedDate'> & {
  isUnlocked: number;
  unlockedDate: string | null;
};

export async function listAchievements(): Promise<Achievement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AchievementRow>('SELECT * FROM achievements;');
  return rows.map((r) => ({
    ...r,
    isUnlocked: !!r.isUnlocked,
    unlockedDate: r.unlockedDate ? new Date(r.unlockedDate) : undefined,
  }));
}

export async function upsertAchievement(a: Achievement): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO achievements (id, title, description, isUnlocked, unlockedDate)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
       isUnlocked=excluded.isUnlocked, unlockedDate=excluded.unlockedDate;`,
    [a.id, a.title, a.description, a.isUnlocked ? 1 : 0, a.unlockedDate?.toISOString() ?? null]
  );
}

// ---------- Recurring templates ----------

export async function listRecurringTemplates(): Promise<RecurringTemplate[]> {
  const db = await getDb();
  return db.getAllAsync<RecurringTemplate>('SELECT * FROM recurring_templates;');
}

export async function upsertRecurringTemplate(t: RecurringTemplate): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recurring_templates (id, name, amount, category, type, everyDay)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, amount=excluded.amount, category=excluded.category,
       type=excluded.type, everyDay=excluded.everyDay;`,
    [t.id, t.name, t.amount, t.category, t.type, t.everyDay]
  );
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_templates WHERE id = ?;', [id]);
}

// ---------- User profile ----------

type UserProfileRow = Omit<UserProfile, 'registeredAt'> & { registeredAt: string };

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserProfileRow>('SELECT * FROM user_profile LIMIT 1;');
  if (!row) return null;
  return { ...row, registeredAt: new Date(row.registeredAt) };
}

export async function upsertUserProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO user_profile (id, name, avatarUri, registeredAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, avatarUri=excluded.avatarUri,
       registeredAt=excluded.registeredAt;`,
    [p.id, p.name, p.avatarUri ?? null, p.registeredAt.toISOString()]
  );
}

export async function resetAllData(): Promise<void> {
  const db = await getDb();
  const tables = [
    'transactions', 'goals', 'credits', 'credit_repayments', 'budget_limits', 'regular_payments', 'deposits',
    'savings_accounts', 'savings_accruals',
    'investments', 'investment_payouts', 'friend_debts', 'insurance_policies', 'wishlist_items', 'notifications',
    'cashback_cards', 'achievements', 'recurring_templates', 'user_profile', 'app_meta',
  ];
  await db.withTransactionAsync(async () => {
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table};`);
    }
  });
}
