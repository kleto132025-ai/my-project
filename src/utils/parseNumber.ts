// В русской локали iOS десятичный разделитель на клавиатуре — запятая ("19,9"), а не точка.
// Обычный parseFloat() понимает только точку и молча обрезает строку на запятой —
// parseFloat("19,9") вернёт 19, а не 19.9. Эта функция нормализует разделитель перед парсингом.
export function parseLocaleNumber(text: string): number {
  return parseFloat(text.trim().replace(',', '.'));
}
