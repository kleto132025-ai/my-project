import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { generateInsights } from '../../utils/aiInsights';

export function AiInsightsScreen() {
  const theme = useTheme();
  const transactions = useFinanceStore((s) => s.transactions);
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  return (
    <ScreenContainer>
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
