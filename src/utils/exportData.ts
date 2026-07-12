import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import type { Transaction } from '../types';

async function shareFile(file: File, mimeType: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  }
}

export async function exportJsonFile(filename: string, data: unknown): Promise<string> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));
  await shareFile(file, 'application/json', 'Экспорт данных (JSON)');
  return file.uri;
}

export async function exportTransactionsCsv(transactions: Transaction[]): Promise<string> {
  const header = 'Дата;Категория;Тип;Сумма;Валюта;Комментарий';
  const rows = transactions.map((t) =>
    [
      format(t.date, 'dd.MM.yyyy HH:mm'),
      t.category,
      t.type === 'expense' ? 'Расход' : t.type === 'income' ? 'Доход' : 'Перевод',
      t.amount.toString().replace('.', ','),
      t.currency,
      t.comment ?? '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(';')
  );
  const csv = '﻿' + [header, ...rows].join('\n');

  const file = new File(Paths.cache, 'transactions.csv');
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await shareFile(file, 'text/csv', 'Экспорт транзакций (CSV)');
  return file.uri;
}

export async function importJsonFile(uri: string): Promise<unknown> {
  const file = new File(uri);
  const text = file.textSync();
  return JSON.parse(text);
}

// Читает произвольный текстовый файл (например CSV-выписку банка) как есть, без парсинга —
// разбор формата дальше делает вызывающий код.
export async function readTextFile(uri: string): Promise<string> {
  const file = new File(uri);
  return file.textSync();
}
