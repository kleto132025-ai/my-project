import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

const EXPENSE_ICONS: Record<string, IconName> = {
  'Продукты': 'cart-outline',
  'Одежда': 'shirt-outline',
  'Маркетплейсы': 'bag-handle-outline',
  'Транспорт': 'bus-outline',
  'Бензин': 'car-outline',
  'Жильё': 'home-outline',
  'Здоровье': 'medkit-outline',
  'Аптека': 'medical-outline',
  'Развлечения': 'game-controller-outline',
  'Образование': 'school-outline',
  'Рестораны': 'restaurant-outline',
  'Связь': 'call-outline',
  'Подписки': 'repeat-outline',
  'Дом/Ремонт': 'hammer-outline',
  'Подарки': 'gift-outline',
  'Спорт': 'barbell-outline',
  'Рабочие обеды': 'fast-food-outline',
  'Такси': 'car-sport-outline',
  'Красота и уход': 'sparkles-outline',
  'Питомцы': 'paw-outline',
  'Хобби': 'color-palette-outline',
  'Штрафы/пени': 'warning-outline',
  'Благотворительность': 'heart-circle-outline',
  'Фотосессия': 'camera-outline',
  'Перевод на счёт': 'swap-horizontal-outline',
  'Кредитная карта': 'card-outline',
  'Кредит': 'trending-down-outline',
  'Ипотека': 'key-outline',
};

const INCOME_ICONS: Record<string, IconName> = {
  'Зарплата': 'cash-outline',
  'Премия': 'trophy-outline',
  'Доп. работа': 'briefcase-outline',
  'Инвестиции': 'trending-up-outline',
  'Кэшбэк': 'wallet-outline',
  'Подарки': 'gift-outline',
  'Аренда': 'business-outline',
  'Фриланс': 'laptop-outline',
  'Проценты по вкладам': 'stats-chart-outline',
  'Перевод со счёта': 'swap-horizontal-outline',
};

export function getCategoryIcon(category: string, type: 'income' | 'expense' | 'transfer'): IconName {
  if (type === 'expense') return EXPENSE_ICONS[category] ?? 'pricetag-outline';
  if (type === 'income') return INCOME_ICONS[category] ?? 'cash-outline';
  return 'swap-horizontal-outline';
}

export const DEFAULT_EXPENSE_CATEGORIES = Object.keys(EXPENSE_ICONS);
export const DEFAULT_INCOME_CATEGORIES = Object.keys(INCOME_ICONS);

// Переводы между своими же счетами (накопительный счёт ⇄ текущий остаток) — не реальные
// траты или доходы, а просто перекладывание денег из одного места в другое. Их не стоит
// учитывать в аналитике "куда уходят деньги"/топ категорий, иначе картина расходов искажается —
// но они по-прежнему нужны как обычные транзакции для правильного "Остатка ДС".
export const TRANSFER_CATEGORIES = ['Перевод на счёт', 'Перевод со счёта'];

// Категории, по которым обычно проще всего сократить траты, если нужно откладывать больше —
// используется финансовым планировщиком для практических советов по экономии. Жильё, еда,
// лекарства, транспорт и обязательные платежи сюда не входят — на них, как правило, не
// получится "просто меньше тратить" без потери качества жизни.
export const DISCRETIONARY_CATEGORIES = [
  'Развлечения',
  'Рестораны',
  'Подписки',
  'Подарки',
  'Спорт',
  'Рабочие обеды',
  'Такси',
  'Красота и уход',
  'Хобби',
  'Фотосессия',
  'Благотворительность',
];
