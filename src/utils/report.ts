import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Transaction, Currency } from '../types';
import { formatCurrency } from './format';
import { normalizeTransactionsToCurrency } from './currency';

const IDENTITY_RATES: Record<Currency, number> = { RUB: 1, USD: 1, EUR: 1 };

export async function generateAndSharePdfReport(
  title: string,
  rawTransactions: Transaction[],
  currency: Currency,
  rates: Record<Currency, number> = IDENTITY_RATES
): Promise<void> {
  // Приводим суммы к валюте отчёта здесь же — вызывающий код может передать транзакции
  // как есть, без предварительной нормализации.
  const transactions = normalizeTransactionsToCurrency(rawTransactions, currency, rates);
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const rows = transactions
    .map(
      (t) => `
      <tr>
        <td>${format(t.date, 'dd.MM.yyyy', { locale: ru })}</td>
        <td>${t.category}</td>
        <td style="color:${t.type === 'expense' ? '#7F1D1D' : '#2563EB'}">
          ${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount, currency)}
        </td>
        <td>${t.comment ?? ''}</td>
      </tr>`
    )
    .join('');

  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Roboto, sans-serif; padding: 24px;">
        <h1 style="color:#1E3A5F;">${title}</h1>
        <p>Доходы: <strong style="color:#2563EB;">${formatCurrency(totalIncome, currency)}</strong></p>
        <p>Расходы: <strong style="color:#7F1D1D;">${formatCurrency(totalExpense, currency)}</strong></p>
        <table style="width:100%; border-collapse: collapse;" cellpadding="6">
          <thead>
            <tr style="background:#F8FAFC; text-align:left;">
              <th>Дата</th><th>Категория</th><th>Сумма</th><th>Комментарий</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  }
}
