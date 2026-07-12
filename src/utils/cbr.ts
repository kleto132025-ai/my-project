export class CbrApiError extends Error {}

const CBR_DAILY_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

// ЦБ отдаёт официальный ежедневный курс только в виде XML (нет публичного JSON), да ещё
// и в кодировке windows-1251. Полноценный XML-парсер ради одной цифры был бы избыточен —
// вместо этого просто ищем блок нужной валюты регулярным выражением. Это безопасно даже
// при "битой" из-за кодировки кириллице: CharCode/Nominal/Value — это ASCII-цифры и латиница,
// которые совпадают в UTF-8 и windows-1251 (страдает только кириллица названия валюты,
// которое нам не нужно).
export function extractCbrRate(xml: string, charCode: 'USD' | 'EUR'): number | null {
  const regex = new RegExp(`<CharCode>${charCode}</CharCode>[\\s\\S]*?<Nominal>(\\d+)</Nominal>[\\s\\S]*?<Value>([\\d.,]+)</Value>`);
  const match = xml.match(regex);
  if (!match) return null;
  const nominal = parseInt(match[1], 10);
  const value = parseFloat(match[2].replace(',', '.'));
  if (!nominal || Number.isNaN(value)) return null;
  return Math.round((value / nominal) * 10000) / 10000;
}

// Официальный курс ЦБ на сегодня — ориентир, а не то, что реально применит банк при обмене
// (у банков своя наценка/спред). Поэтому используется только как автозаполнение поля курса
// в Настройках — пользователь всегда может тут же подправить значение под свой банк.
export async function fetchCbrRate(currency: 'USD' | 'EUR'): Promise<number> {
  let response: Response;
  try {
    response = await fetch(CBR_DAILY_URL);
  } catch {
    throw new CbrApiError('Нет соединения с ЦБ РФ. Проверьте интернет.');
  }
  if (!response.ok) {
    throw new CbrApiError(`Ошибка запроса курса ЦБ (код ${response.status})`);
  }

  const xml = await response.text();
  const rate = extractCbrRate(xml, currency);
  if (rate == null) {
    throw new CbrApiError(`Не удалось найти курс ${currency} в ответе ЦБ РФ`);
  }
  return rate;
}
