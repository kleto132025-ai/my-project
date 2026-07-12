import type { AssetType } from '../types';

export class MoexApiError extends Error {}

interface IssBlock {
  columns: string[];
  data: (string | number | null)[][];
}

// ISS отдаёт каждый блок как отдельные массивы columns/data, а не готовые объекты —
// эта функция сводит их в массив обычных объектов по имени колонки.
function issRows(block: IssBlock | undefined): Record<string, string | number | null>[] {
  if (!block) return [];
  return block.data.map((row) => {
    const obj: Record<string, string | number | null> = {};
    block.columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Берёт цену последней сделки (LAST) из первой строки marketdata, где она есть — по одному
// тикеру ISS может вернуть несколько строк (по одной на каждый режим торгов/борд, например
// основные торги и режим переговорных сделок), поэтому просто ищем первую с ненулевым LAST.
// Если торги ещё не начались (LAST == null у всех строк) — откатываемся на PREVPRICE (цена
// закрытия предыдущей сессии) из блока securities, чтобы не оставлять актив вовсе без цены.
export function extractLastPrice(data: unknown): number | null {
  const root = data as { marketdata?: IssBlock; securities?: IssBlock } | null | undefined;
  for (const row of issRows(root?.marketdata)) {
    if (typeof row.LAST === 'number') return row.LAST;
  }
  for (const row of issRows(root?.securities)) {
    if (typeof row.PREVPRICE === 'number') return row.PREVPRICE;
  }
  return null;
}

// Облигации и акции/фонды числятся в разных "рынках" ISS — у обоих есть единый URL без
// указания конкретного борда (запрос сразу по всем бордам, где торгуется тикер), поэтому
// не нужно знать заранее TQBR/TQTF/TQOB/TQCB и т.п.
function marketFor(assetType: AssetType): 'shares' | 'bonds' | null {
  if (assetType === 'bond') return 'bonds';
  if (assetType === 'stock' || assetType === 'fund') return 'shares';
  return null;
}

// Подтягивает текущую цену бумаги с Мосбиржи по тикеру (без ключа/регистрации — публичный
// ISS API). Крипта на Мосбирже не торгуется — для неё сразу понятная ошибка вместо запроса
// в никуда.
export async function fetchMoexPrice(ticker: string, assetType: AssetType): Promise<number> {
  const market = marketFor(assetType);
  if (!market) {
    throw new MoexApiError('Этот тип актива не торгуется на Мосбирже — цену нужно вводить вручную');
  }
  const secId = encodeURIComponent(ticker.trim().toUpperCase());
  const url =
    `https://iss.moex.com/iss/engines/stock/markets/${market}/securities/${secId}.json` +
    `?iss.meta=off&iss.only=marketdata,securities&marketdata.columns=LAST&securities.columns=PREVPRICE`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new MoexApiError('Нет соединения с Мосбиржей. Проверьте интернет.');
  }
  if (!response.ok) {
    throw new MoexApiError(`Ошибка запроса к Мосбирже (код ${response.status})`);
  }

  const data = await response.json();
  const price = extractLastPrice(data);
  if (price == null) {
    throw new MoexApiError(`Тикер «${ticker.trim().toUpperCase()}» не найден на Мосбирже или по нему нет цены`);
  }
  return price;
}
