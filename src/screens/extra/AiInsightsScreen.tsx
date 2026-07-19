import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { AppButton } from '../../components/AppButton';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useAiStore } from '../../store/aiStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTopCategories, useBudgetLimitsWithSpent } from '../../hooks/useFinancials';
import { generateInsights, buildFinancialSummaryPrompt } from '../../utils/aiInsights';
import { askClaude, ClaudeApiError } from '../../utils/claudeApi';

export function AiInsightsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const hasApiKey = useAiStore((s) => s.hasApiKey);
  const getApiKey = useAiStore((s) => s.getApiKey);
  const lastPrompt = useAiStore((s) => s.lastPrompt);
  const lastInsight = useAiStore((s) => s.lastInsight);
  const setLastInsight = useAiStore((s) => s.setLastInsight);
  const topExpenseCategories = useTopCategories('expense', 5);
  const budgetLimits = useBudgetLimitsWithSpent();
  const goals = useFinanceStore((s) => s.goals);

  const insights = useMemo(() => generateInsights(transactions, goals, currency), [transactions, goals, currency]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Промпт строится из тех же агрегированных цифр, что уже показаны на экранах приложения —
  // если с прошлого анализа они не изменились (ничего нового не внесено), промпт будет
  // побайтово таким же, что и в кэше, и повторный платный запрос к ИИ не нужен.
  const currentPrompt = useMemo(() => {
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return buildFinancialSummaryPrompt({
      totalIncome,
      totalExpense,
      currency,
      topExpenseCategories,
      budgetLimits: budgetLimits.map((l) => ({ category: l.category, limit: l.limit, spent: l.spent })),
      goals: goals.map((g) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
        isShared: g.isShared,
        partnerSavedAmount: g.partnerSavedAmount,
      })),
    });
  }, [transactions, currency, topExpenseCategories, budgetLimits, goals]);

  const runAiAnalysis = async (prompt: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setAiError('API-ключ не найден — добавьте его в Настройках');
        return;
      }
      const response = await askClaude(apiKey, prompt);
      setLastInsight(prompt, response);
    } catch (e) {
      setAiError(e instanceof ClaudeApiError ? e.message : 'Не удалось получить ответ от ИИ');
    } finally {
      setAiLoading(false);
    }
  };

  // Автоматический анализ: как только на экране появляется ключ и построенный из текущих
  // данных промпт отличается от того, что был при последнем анализе (то есть в приложение
  // что-то внесли), запрос к ИИ уходит сам — нажимать кнопку не нужно. Кэш показывается
  // мгновенно, пока в фоне (если нужно) готовится обновление.
  useEffect(() => {
    if (!hasApiKey || aiLoading) return;
    if (currentPrompt === lastPrompt) return;
    runAiAnalysis(currentPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey, currentPrompt]);

  return (
    <ScreenContainer>
      <Card>
        <View style={styles.row}>
          <Ionicons name="sparkles-outline" size={20} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>ИИ-рекомендации</Text>
        </View>
        {!hasApiKey ? (
          <>
            <Text style={{ color: theme.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm }}>
              Добавьте API-ключ в Настройках, чтобы получить персональные рекомендации от настоящего ИИ
              вместо встроенной эвристики ниже.
            </Text>
            <AppButton title="Перейти в настройки" variant="outline" onPress={() => navigation.navigate('Settings')} />
          </>
        ) : (
          <>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.sm }}>
              {aiLoading
                ? 'Обновляем анализ по свежим данным…'
                : 'Анализ обновляется автоматически при появлении новых данных.'}
            </Text>
            {aiError && <Text style={{ color: theme.danger, marginBottom: spacing.sm, fontSize: 13 }}>{aiError}</Text>}
            {lastInsight && (
              <Text style={{ color: theme.text, marginBottom: spacing.sm, lineHeight: 21 }}>{lastInsight}</Text>
            )}
            <AppButton
              title={lastInsight ? 'Обновить сейчас' : 'Получить совет от ИИ'}
              variant="outline"
              onPress={() => runAiAnalysis(currentPrompt)}
              loading={aiLoading}
            />
          </>
        )}
      </Card>

      <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
        Эвристический анализ на основе ваших транзакций и типичных норм расходов.
      </Text>
      {insights.map((insight, index) => (
        <Card key={index}>
          <View style={styles.row}>
            <Ionicons name="bulb-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{insight.title}</Text>
              <Text style={{ color: theme.textMuted, marginTop: 2 }}>{insight.message}</Text>
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  title: { fontSize: 14, fontWeight: '700' },
});
