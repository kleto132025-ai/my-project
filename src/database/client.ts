import * as SQLite from 'expo-sqlite';
import { SCHEMA_STATEMENTS } from './schema';

const DATABASE_NAME = 'finance.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// SQLite не поддерживает "ADD COLUMN IF NOT EXISTS", а CREATE TABLE IF NOT EXISTS не
// добавляет новые колонки в уже существующую таблицу. Для тех, кто установил приложение
// до появления ипотеки/истории погашений, докатываем недостающие колонки вручную —
// ошибка "duplicate column" на уже обновлённой базе безопасно игнорируется.
const MIGRATION_STATEMENTS = [
  "ALTER TABLE credits ADD COLUMN kind TEXT NOT NULL DEFAULT 'credit';",
  'ALTER TABLE credits ADD COLUMN propertyAddress TEXT;',
  'ALTER TABLE credits ADD COLUMN downPayment REAL;',
  'ALTER TABLE credit_repayments ADD COLUMN principalPortion REAL;',
  'ALTER TABLE credits ADD COLUMN currentValue REAL;',
  'ALTER TABLE credits ADD COLUMN renovationCosts REAL;',
  'ALTER TABLE insurance_policies ADD COLUMN creditId TEXT;',
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const statement of MIGRATION_STATEMENTS) {
    try {
      await db.execAsync(statement);
    } catch {
      // Колонка уже существует — база и так актуальна.
    }
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(SCHEMA_STATEMENTS);
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?;',
    [key]
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value]
  );
}
