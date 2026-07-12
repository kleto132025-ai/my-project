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

export interface MoexSecuritySearchResult {
  secid: string;
  shortname: string;
}

// Достаёт список тикеров-кандидатов из ответа поиска — модель columns/data та же, что и у
// остальных ответов ISS, только имена колонок здесь в нижнем регистре (secid/shortname/is_traded),
// а не в верхнем (LAST/PREVPRICE), как у котировок.
export function extractSecuritySearchResults(data: unknown): MoexSecuritySearchResult[] {
  const root = data as { securities?: IssBlock } | null | undefined;
  const seen = new Set<string>();
  const results: MoexSecuritySearchResult[] = [];
  for (const row of issRows(root?.securities)) {
    if (row.is_traded !== 1) continue;
    const { secid, shortname } = row;
    if (typeof secid !== 'string' || typeof shortname !== 'string') continue;
    if (seen.has(secid)) continue;
    seen.add(secid);
    results.push({ secid, shortname });
  }
  return results;
}

// Ищет бумаги по названию компании ("Сбербанк", "Х5") или частичному тикеру — большинство
// людей не помнят точный биржевой код наизусть. Тот же публичный ISS API, без ключа.
export async function searchMoexSecurities(query: string): Promise<MoexSecuritySearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url =
    `https://iss.moex.com/iss/securities.json?q=${encodeURIComponent(trimmed)}` +
    `&iss.meta=off&securities.columns=secid,shortname,is_traded`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new MoexApiError('Нет соединения с Мосбиржей. Проверьте интернет.');
  }
  if (!response.ok) {
    throw new MoexApiError(`Ошибка поиска на Мосбирже (код ${response.status})`);
  }

  const data = await response.json();
  return extractSecuritySearchResults(data).slice(0, 10);
}
