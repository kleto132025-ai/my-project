// Даты хранятся как TEXT в формате ISO-8601 (совместимо с new Date(...).toISOString()/new Date(str)),
// булевы значения — как INTEGER 0/1 (в SQLite нет отдельного типа BOOLEAN).
// Конвертация в типизированные объекты происходит в database/repository.ts.
export const SCHEMA_STATEMENTS = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  comment TEXT,
  currency TEXT NOT NULL,
  createdBy TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  targetAmount REAL NOT NULL,
  savedAmount REAL NOT NULL,
  deadline TEXT NOT NULL,
  priority TEXT NOT NULL,
  isShared INTEGER DEFAULT 0,
  partnerName TEXT,
  partnerSavedAmount REAL
);

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'credit',
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  rate REAL NOT NULL,
  termMonths INTEGER NOT NULL,
  monthlyPayment REAL NOT NULL,
  remaining REAL NOT NULL,
  nextPaymentDate TEXT NOT NULL,
  startDate TEXT NOT NULL,
  propertyAddress TEXT,
  downPayment REAL
);

-- История досрочных погашений: одна запись на каждое частичное или полное погашение,
-- чтобы у кредита/ипотеки была видна не только текущая сумма остатка, но и когда именно
-- и на сколько его гасили.
CREATE TABLE IF NOT EXISTS credit_repayments (
  id TEXT PRIMARY KEY NOT NULL,
  creditId TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_limits (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  "limit" REAL NOT NULL,
  spent REAL NOT NULL DEFAULT 0,
  period TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS regular_payments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  dayOfMonth INTEGER NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  rate REAL NOT NULL,
  openDate TEXT NOT NULL,
  closeDate TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  assetType TEXT NOT NULL,
  quantity REAL NOT NULL,
  purchasePrice REAL NOT NULL,
  currentPrice REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_debts (
  id TEXT PRIMARY KEY NOT NULL,
  personName TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  reminderDate TEXT
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  insurer TEXT NOT NULL,
  amount REAL NOT NULL,
  endDate TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  savedAmount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  relatedScreen TEXT,
  relatedId TEXT
);

CREATE TABLE IF NOT EXISTS cashback_cards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  cashbackPercent REAL NOT NULL,
  accumulated REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  isUnlocked INTEGER NOT NULL DEFAULT 0,
  unlockedDate TEXT
);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  everyDay INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  avatarUri TEXT,
  registeredAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
