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

export interface GoalProgressInput {
  name: string;
  targetAmount: number;
  savedAmount: number;
  isShared?: boolean;
  partnerSavedAmount?: number;
}

export function generateInsights(
  transactions: Transaction[],
  goals: GoalProgressInput[] = [],
  currency = ''
): Insight[] {
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

  // Для совместной цели остаток считается от суммы вкладов обоих участников — та же логика,
  // что и на карточке цели в "Накоплениях" (src/screens/savings/SavingsScreen.tsx), чтобы
  // цифры в двух местах не разошлись.
  for (const goal of goals) {
    const totalSaved = goal.savedAmount + (goal.isShared ? goal.partnerSavedAmount ?? 0 : 0);
    const remaining = Math.max(goal.targetAmount - totalSaved, 0);
    if (remaining <= 0 || goal.targetAmount <= 0) continue;
    const remainingPercent = Math.round((remaining / goal.targetAmount) * 100);
    insights.push({
      title: `Цель «${goal.name}»`,
      message: `Осталось накопить ${Math.round(remaining)} ${currency} — это ${remainingPercent}% от цели.`,
    });
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
  goals?: GoalProgressInput[];
}

// Собирает компактную текстовую сводку (не сырые транзакции — только агрегированные цифры,
// которые уже и так показываются пользователю на экранах приложения) и формирует из неё
// промпт для реального ИИ. Вынесено в чистую функцию отдельно от сетевого вызова, чтобы
// промпт можно было проверить тестом без обращения к API.
export function buildFinancialSummaryPrompt(input: FinancialSummaryInput): string {
  const { totalIncome, totalExpense, currency, topExpenseCategories, budgetLimits, goals = [] } = input;
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

  if (goals.length > 0) {
    lines.push('', 'Финансовые цели:');
    for (const g of goals) {
      const totalSaved = g.savedAmount + (g.isShared ? g.partnerSavedAmount ?? 0 : 0);
      const remaining = Math.max(g.targetAmount - totalSaved, 0);
      const remainingPercent = g.targetAmount > 0 ? Math.round((remaining / g.targetAmount) * 100) : 0;
      lines.push(`- ${g.name}: накоплено ${totalSaved} из ${g.targetAmount} ${currency} (осталось ${remainingPercent}%)`);
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
