import React, { useMemo, useState } from 'react';
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
  const topExpenseCategories = useTopCategories('expense', 5);
  const budgetLimits = useBudgetLimitsWithSpent();

  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAskAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setAiError('API-ключ не найден — добавьте его в Настройках');
        return;
      }
      const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const prompt = buildFinancialSummaryPrompt({
        totalIncome,
        totalExpense,
        currency,
        topExpenseCategories,
        budgetLimits: budgetLimits.map((l) => ({ category: l.category, limit: l.limit, spent: l.spent })),
      });
      const response = await askClaude(apiKey, prompt);
      setAiResponse(response);
    } catch (e) {
      setAiError(e instanceof ClaudeApiError ? e.message : 'Не удалось получить ответ от ИИ');
    } finally {
      setAiLoading(false);
    }
  };

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
            <AppButton
              title={aiResponse ? 'Обновить анализ' : 'Получить совет от ИИ'}
              onPress={handleAskAi}
              loading={aiLoading}
            />
            {aiError && (
              <Text style={{ color: theme.danger, marginTop: spacing.sm, fontSize: 13 }}>{aiError}</Text>
            )}
            {aiResponse && (
              <Text style={{ color: theme.text, marginTop: spacing.sm, lineHeight: 21 }}>{aiResponse}</Text>
            )}
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
