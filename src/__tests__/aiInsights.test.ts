import { buildFinancialSummaryPrompt } from '../utils/aiInsights';

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
});
