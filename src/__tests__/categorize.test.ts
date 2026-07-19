import { suggestCategory } from '../utils/categorize';

describe('suggestCategory', () => {
  it('suggests expense category from keywords', () => {
    expect(suggestCategory('Купил продукты в Пятерочке', 'expense')).toBe('Продукты');
  });

  it('suggests income category from keywords', () => {
    expect(suggestCategory('Зарплата за июнь', 'income')).toBe('Зарплата');
  });

  it('returns undefined when nothing matches', () => {
    expect(suggestCategory('что-то непонятное', 'expense')).toBeUndefined();
  });

  it('returns undefined for empty comment', () => {
    expect(suggestCategory('', 'expense')).toBeUndefined();
  });

  it('categorizes taxi as "Такси" and not "Транспорт"', () => {
    expect(suggestCategory('Такси до дома', 'expense')).toBe('Такси');
  });

  it('still categorizes public transport as "Транспорт"', () => {
    expect(suggestCategory('Проезд на автобусе', 'expense')).toBe('Транспорт');
  });
});
