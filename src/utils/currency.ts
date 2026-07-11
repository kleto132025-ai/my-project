import type { Currency, Transaction } from '../types';

// exchangeRates хранит курс "сколько RUB стоит 1 единица валюты" (RUB всегда 1).
// Конвертация идёт через RUB как через общий знаменатель: from -> RUB -> to.
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  const inRub = amount * (rates[from] || 1);
  const targetRate = rates[to] || 1;
  return targetRate > 0 ? inRub / targetRate : inRub;
}

// Транзакции создаются в валюте, выбранной на момент добавления (Transaction.currency),
// но сводные показатели (баланс, топ категорий, прогноз) должны считаться в ОДНОЙ валюте —
// иначе смена валюты в настройках задним числом просто переклеивает символ на старые суммы,
// не пересчитывая их. Эта функция приводит все суммы к текущей валюте отображения.
export function normalizeTransactionsToCurrency(
  transactions: Transaction[],
  displayCurrency: Currency,
  rates: Record<Currency, number>
): Transaction[] {
  return transactions.map((t) =>
    t.currency === displayCurrency
      ? t
      : { ...t, amount: convertAmount(t.amount, t.currency, displayCurrency, rates), currency: displayCurrency }
  );
}
