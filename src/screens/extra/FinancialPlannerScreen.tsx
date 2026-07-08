import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { calculateForecast, calculateBalance } from '../../utils/calculations';

const HORIZONS = [1, 3, 6, 12];

export function FinancialPlannerScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const transactions = useFinanceStore((s) => s.transactions);

  const currentBalance = calculateBalance(transactions);
  const forecasts = useMemo(
    () => HORIZONS.map((months) => ({ months, value: calculateForecast(transactions, months) })),
    [transactions]
  );

  return (
    <ScreenContainer>
      <Card>
        <Text style={{ color: theme.textMuted }}>Текущий баланс</Text>
        <Text style={[styles.balance, { color: theme.text }]}>{formatCurrency(currentBalance, currency)}</Text>
      </Card>
      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Прогноз баланса</Text>
        {forecasts.map((f) => (
          <View key={f.months} style={styles.row}>
            <Text style={{ color: theme.textMuted }}>Через {f.months} мес.</Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(f.value, currency)}</Text>
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
