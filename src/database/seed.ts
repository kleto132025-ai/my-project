import { generateId } from '../utils/id';
import { getMeta, setMeta } from './client';
import {
  insertTransaction,
  upsertGoal,
  upsertCredit,
  upsertRegularPayment,
  upsertBudgetLimit,
  upsertFriendDebt,
  upsertInsurancePolicy,
  upsertDeposit,
  upsertInvestment,
  upsertAchievement,
} from './repository';
import { calculateMonthlyPayment } from '../utils/calculations';

// Флаг сидирования хранится в app_meta, чтобы демо-данные добавлялись один раз —
// при повторных запусках приложения seedDemoDataIfNeeded() сразу выходит.
export const SEED_FLAG_KEY = 'demo_data_seeded';

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedDemoDataIfNeeded(): Promise<void> {
  const seeded = await getMeta(SEED_FLAG_KEY);
  if (seeded === 'true') return;

  // 7 транзакций
  const transactionsSeed = [
    { amount: 3200, category: 'Продукты', type: 'expense' as const, date: daysAgo(0), comment: 'Пятерочка' },
    { amount: 500, category: 'Транспорт', type: 'expense' as const, date: daysAgo(1), comment: 'Такси' },
    { amount: 85000, category: 'Зарплата', type: 'income' as const, date: daysAgo(3), comment: 'Зарплата за месяц' },
    { amount: 1200, category: 'Рестораны', type: 'expense' as const, date: daysAgo(4), comment: 'Кафе с друзьями' },
    { amount: 4500, category: 'Одежда', type: 'expense' as const, date: daysAgo(6), comment: 'Куртка' },
    { amount: 3000, category: 'Кэшбэк', type: 'income' as const, date: daysAgo(8), comment: 'Кэшбэк за месяц' },
    { amount: 900, category: 'Связь', type: 'expense' as const, date: daysAgo(10), comment: 'Мобильная связь' },
  ];
  for (const t of transactionsSeed) {
    await insertTransaction({ id: generateId(), currency: 'RUB', ...t });
  }

  // 2 цели
  await upsertGoal({
    id: generateId(),
    name: 'Путешествие',
    targetAmount: 100000,
    savedAmount: 30000,
    deadline: daysFromNow(180),
    priority: 'medium',
  });
  await upsertGoal({
    id: generateId(),
    name: 'Квартира',
    targetAmount: 2000000,
    savedAmount: 100000,
    deadline: daysFromNow(1800),
    priority: 'high',
  });

  // 1 кредит
  const creditAmount = 300000;
  const creditRate = 15;
  const creditTerm = 24;
  await upsertCredit({
    id: generateId(),
    kind: 'credit',
    name: 'Потребительский кредит',
    amount: creditAmount,
    rate: creditRate,
    termMonths: creditTerm,
    monthlyPayment: calculateMonthlyPayment(creditAmount, creditRate, creditTerm),
    remaining: creditAmount,
    nextPaymentDate: daysFromNow(20),
    startDate: daysAgo(10),
  });

  // 3 регулярных платежа
  await upsertRegularPayment({
    id: generateId(),
    name: 'Коммуналка',
    amount: 6500,
    category: 'Жильё',
    dayOfMonth: 10,
    isActive: true,
    type: 'expense',
  });
  await upsertRegularPayment({
    id: generateId(),
    name: 'Подписка Кинопоиск',
    amount: 399,
    category: 'Подписки',
    dayOfMonth: 15,
    isActive: true,
    type: 'expense',
  });
  await upsertRegularPayment({
    id: generateId(),
    name: 'Интернет',
    amount: 700,
    category: 'Связь',
    dayOfMonth: 5,
    isActive: true,
    type: 'expense',
  });

  // 2 лимита
  await upsertBudgetLimit({
    id: generateId(),
    category: 'Продукты',
    limit: 30000,
    spent: 3200,
    period: 'month',
  });
  await upsertBudgetLimit({
    id: generateId(),
    category: 'Рестораны',
    limit: 10000,
    spent: 1200,
    period: 'month',
  });

  // 1 долг другу
  await upsertFriendDebt({
    id: generateId(),
    personName: 'Андрей',
    amount: 5000,
    status: 'i_owe',
    isPaid: false,
    reminderDate: daysFromNow(7),
  });

  // 1 полис страхования
  await upsertInsurancePolicy({
    id: generateId(),
    type: 'ОСАГО',
    insurer: 'Ингосстрах',
    amount: 8500,
    endDate: daysFromNow(90),
  });

  // 2 вклада
  await upsertDeposit({
    id: generateId(),
    name: 'Накопительный счёт',
    amount: 150000,
    rate: 12,
    openDate: daysAgo(60),
    closeDate: daysFromNow(305),
  });
  await upsertDeposit({
    id: generateId(),
    name: 'Вклад "Доходный"',
    amount: 200000,
    rate: 14,
    openDate: daysAgo(30),
    closeDate: daysFromNow(335),
  });

  // 1 инвестиция
  await upsertInvestment({
    id: generateId(),
    name: 'Сбербанк',
    assetType: 'stock',
    quantity: 20,
    purchasePrice: 250,
    currentPrice: 285,
  });

  // Достижения (шаблон, разблокируются по мере использования)
  const achievements = [
    { id: generateId(), title: 'Первая транзакция', description: 'Добавьте первую транзакцию', isUnlocked: true, unlockedDate: daysAgo(10) },
    { id: generateId(), title: '100 транзакций', description: 'Добавьте 100 транзакций', isUnlocked: false },
    { id: generateId(), title: 'Сохранил 100 000 ₽', description: 'Накопите 100 000 ₽ в целях', isUnlocked: false },
    { id: generateId(), title: 'Погасил кредит', description: 'Полностью погасите кредит', isUnlocked: false },
    { id: generateId(), title: 'Выполнил цель', description: 'Достигните финансовой цели', isUnlocked: false },
  ];
  for (const a of achievements) {
    await upsertAchievement(a);
  }

  await setMeta(SEED_FLAG_KEY, 'true');
}
