import { buildFinancialSummaryPrompt, generateInsights } from '../utils/aiInsights';

describe('buildFinancialSummaryPrompt', () => {
  it('includes income, expense and savings rate', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 100000,
      totalExpense: 70000,
      currency: 'RUB',
      topExpenseCategories: [],
      budgetLimits: [],
    });
    expect(prompt).toContain('Доходы: 100000 RUB');
    expect(prompt).toContain('Расходы: 70000 RUB');
    expect(prompt).toContain('Норма сбережений: 30%');
  });

  it('omits savings rate when there is no income', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 0,
      totalExpense: 5000,
      currency: 'RUB',
      topExpenseCategories: [],
      budgetLimits: [],
    });
    expect(prompt).not.toContain('Норма сбережений');
  });

  it('lists top expense categories and budget limits when provided', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 100000,
      totalExpense: 70000,
      currency: 'RUB',
      topExpenseCategories: [{ category: 'Продукты', total: 20000, percent: 29 }],
      budgetLimits: [{ category: 'Продукты', limit: 25000, spent: 20000 }],
    });
    expect(prompt).toContain('Продукты: 20000 RUB (29% от расходов)');
    expect(prompt).toContain('Продукты: потрачено 20000 из 25000 RUB');
  });

  it('asks for a fixed number of concrete, markdown-free recommendations', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 0,
      totalExpense: 0,
      currency: 'RUB',
      topExpenseCategories: [],
      budgetLimits: [],
    });
    expect(prompt).toContain('3–4 конкретных');
    expect(prompt).toContain('без markdown-разметки');
  });

  it('lists goal progress with the remaining amount and percent when goals are provided', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 100000,
      totalExpense: 70000,
      currency: 'RUB',
      topExpenseCategories: [],
      budgetLimits: [],
      goals: [{ name: 'Путешествие', targetAmount: 100000, savedAmount: 30000 }],
    });
    expect(prompt).toContain('Путешествие: накоплено 30000 из 100000 RUB (осталось 70%)');
  });

  it('sums both contributors for a shared goal', () => {
    const prompt = buildFinancialSummaryPrompt({
      totalIncome: 100000,
      totalExpense: 70000,
      currency: 'RUB',
      topExpenseCategories: [],
      budgetLimits: [],
      goals: [
        { name: 'Квартира', targetAmount: 100000, savedAmount: 20000, isShared: true, partnerSavedAmount: 30000 },
      ],
    });
    expect(prompt).toContain('Квартира: накоплено 50000 из 100000 RUB (осталось 50%)');
  });
});

describe('generateInsights', () => {
  it('reports how much is left to save toward a goal, in percent and amount', () => {
    const insights = generateInsights(
      [],
      [{ name: 'Путешествие', targetAmount: 100000, savedAmount: 30000 }],
      'RUB'
    );
    const goalInsight = insights.find((i) => i.title === 'Цель «Путешествие»');
    expect(goalInsight?.message).toBe('Осталось накопить 70000 RUB — это 70% от цели.');
  });

  it('combines both contributors for a shared goal', () => {
    const insights = generateInsights(
      [],
      [{ name: 'Квартира', targetAmount: 100000, savedAmount: 20000, isShared: true, partnerSavedAmount: 30000 }],
      'RUB'
    );
    const goalInsight = insights.find((i) => i.title === 'Цель «Квартира»');
    expect(goalInsight?.message).toBe('Осталось накопить 50000 RUB — это 50% от цели.');
  });

  it('does not mention a goal that has already been reached', () => {
    const insights = generateInsights(
      [],
      [{ name: 'Путешествие', targetAmount: 100000, savedAmount: 100000 }],
      'RUB'
    );
    expect(insights.find((i) => i.title === 'Цель «Путешествие»')).toBeUndefined();
  });
});
