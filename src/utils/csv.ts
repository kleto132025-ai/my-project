// Разбор CSV-выписки из банка. Без сторонней библиотеки — как и с ISS/ЦБ, формат достаточно
// простой и стабильный, чтобы не тащить целый пакет ради одной функции. Поддерживает кавычки
// с экранированием ("") и оба распространённых разделителя (запятая и точка с запятой — вторая
// часто встречается у банков с русской локалью, где запятая уже занята под десятичный разделитель).

export function detectDelimiter(firstLine: string): ',' | ';' {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

export function parseCsv(text: string, delimiter?: string): string[][] {
  const delim = delimiter ?? detectDelimiter(text.slice(0, text.search(/\r?\n/)) || text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delim) {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // пропускаем — перевод строки обрабатывается по \n
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Пустые строки (например, висящий перевод строки в конце файла) не считаются данными.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

// Суммы в банковских выписках приходят в самых разных видах: "1234.56", "1 234,56", "-1,234.56",
// "(1234,56)" (скобки — распространённый способ показать списание), с пробелами-разделителями
// тысяч или значком валюты. Последний из встретившихся разделителей (, или .) считается
// десятичным — так работает подавляющее большинство банковских экспортов независимо от локали.
export function parseCsvAmount(raw: string): number {
  let s = raw.trim();
  if (!s) return NaN;
  const isParenNegative = /^\(.*\)$/.test(s);
  if (isParenNegative) s = s.slice(1, -1);
  s = s.replace(/[^\d.,-]/g, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    s = s.replace(',', '.');
  }

  const value = parseFloat(s);
  if (Number.isNaN(value)) return NaN;
  return isParenNegative ? -Math.abs(value) : value;
}

// Поддерживает и "год впереди" (ISO, YYYY-MM-DD), и "день впереди" (стандартный для российских
// выписок формат ДД.ММ.ГГГГ) с любым из разделителей . / -.
export function parseCsvDate(raw: string): Date | null {
  const s = raw.trim();
  const isoMatch = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (isoMatch) {
    const [, y, mo, d] = isoMatch;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dmyMatch = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (dmyMatch) {
    const [, d, mo, y] = dmyMatch;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
