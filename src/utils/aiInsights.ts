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

export interface FinancialSummaryInput {
  totalIncome: number;
  totalExpense: number;
  currency: string;
  topExpenseCategories: { category: string; total: number; percent: number }[];
  budgetLimits: { category: string; limit: number; spent: number }[];
}

// Собирает компактную текстовую сводку (не сырые транзакции — только агрегированные цифры,
// которые уже и так показываются пользователю на экранах приложения) и формирует из неё
// промпт для реального ИИ. Вынесено в чистую функцию отдельно от сетевого вызова, чтобы
// промпт можно было проверить тестом без обращения к API.
export function buildFinancialSummaryPrompt(input: FinancialSummaryInput): string {
  const { totalIncome, totalExpense, currency, topExpenseCategories, budgetLimits } = input;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : null;

  const lines: string[] = [
    'Ты — финансовый помощник в приложении для учёта личных финансов.',
    'Вот сводка по операциям пользователя (все суммы — в его текущей валюте отображения):',
    '',
    `Доходы: ${totalIncome} ${currency}`,
    `Расходы: ${totalExpense} ${currency}`,
  ];
  if (savingsRate !== null) lines.push(`Норма сбережений: ${savingsRate}%`);

  if (topExpenseCategories.length > 0) {
    lines.push('', 'Топ категорий расходов:');
    for (const c of topExpenseCategories) {
      lines.push(`- ${c.category}: ${c.total} ${currency} (${c.percent}% от расходов)`);
    }
  }

  if (budgetLimits.length > 0) {
    lines.push('', 'Лимиты бюджета по категориям:');
    for (const l of budgetLimits) {
      lines.push(`- ${l.category}: потрачено ${l.spent} из ${l.limit} ${currency}`);
    }
  }

  lines.push(
    '',
    'Дай 3–4 конкретных, практичных совета на русском языке, обращаясь на "вы". Опирайся на',
    'приведённые цифры, а не на общие фразы вроде "составьте бюджет" или "откладывайте больше".',
    'Пиши короткими абзацами без markdown-разметки (без звёздочек, решёток, нумерованных списков).'
  );

  return lines.join('\n');
}
