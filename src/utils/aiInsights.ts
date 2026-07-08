import type { Transaction } from '../types';

export interface Insight {
  title: string;
  message: string;
}

const CATEGORY_BENCHMARKS: Record<string, number> = {
  'Продукты': 15,
  'Рестораны': 8,
  'Развлечения': 7,
  'Подписки': 3,
  'Транспорт': 10,
  'Жильё': 30,
};

export function generateInsights(transactions: Transaction[]): Insight[] {
  const insights: Insight[] = [];
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    if (savingsRate < 10) {
      insights.push({
        title: 'Низкая норма сбережений',
        message: `Вы откладываете всего ${Math.max(Math.round(savingsRate), 0)}% дохода. Рекомендуемая норма — от 20%.`,
      });
    } else {
      insights.push({
        title: 'Хорошая норма сбережений',
        message: `Вы откладываете ${Math.round(savingsRate)}% дохода — отличный результат!`,
      });
    }
  }

  const expenseByCategory = new Map<string, number>();
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + t.amount);
  }

  for (const [category, benchmarkPercent] of Object.entries(CATEGORY_BENCHMARKS)) {
    const spent = expenseByCategory.get(category);
    if (!spent || totalIncome <= 0) continue;
    const actualPercent = (spent / totalIncome) * 100;
    if (actualPercent > benchmarkPercent * 1.3) {
      insights.push({
        title: `Много трат: ${category}`,
        message: `Категория "${category}" занимает ${Math.round(actualPercent)}% дохода при обычной норме около ${benchmarkPercent}%. Попробуйте сократить расходы здесь.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Всё сбалансировано',
      message: 'Пока не нашли отклонений от разумных норм расходов. Так держать!',
    });
  }

  return insights;
}
