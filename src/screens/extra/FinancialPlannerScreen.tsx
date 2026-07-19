import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import { calculateForecast, calculateBalance, buildSavingsPlan } from '../../utils/calculations';
import { normalizeTransactionsToCurrency } from '../../utils/currency';
import { DISCRETIONARY_CATEGORIES, TRANSFER_CATEGORIES } from '../../theme/categoryIcons';

const HORIZONS = [1, 3, 6, 12];

export function FinancialPlannerScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const rawTransactions = useFinanceStore((s) => s.transactions);

  const transactions = useMemo(
    () => normalizeTransactionsToCurrency(rawTransactions, currency, rates),
    [rawTransactions, currency, rates]
  );

  const currentBalance = calculateBalance(transactions);
  const forecasts = useMemo(
    () => HORIZONS.map((months) => ({ months, value: calculateForecast(transactions, months) })),
    [transactions]
  );
  const plan = useMemo(
    () => buildSavingsPlan(transactions, DISCRETIONARY_CATEGORIES, TRANSFER_CATEGORIES),
    [transactions]
  );

  const hasIncome = plan.avgMonthlyIncome > 0;
  const meetsTargetLow = plan.currentMonthlySavings >= plan.targetLow;

  return (
    <ScreenContainer>
      <Card>
        <Text style={{ color: theme.textMuted }}>Текущий баланс</Text>
        <Text style={[styles.balance, { color: theme.text }]}>{formatCurrency(currentBalance, currency)}</Text>
      </Card>

      {hasIncome ? (
        <Card>
          <Text style={[styles.title, { color: theme.text }]}>Сколько стоит откладывать</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
            Общепринятый ориентир — откладывать 10–30% от дохода. Средний доход в месяц:{' '}
            {formatCurrency(plan.avgMonthlyIncome, currency)}.
          </Text>
          <View style={styles.row}>
            <Text style={{ color: theme.textMuted }}>Рекомендуемый диапазон</Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {formatCurrency(plan.targetLow, currency)} – {formatCurrency(plan.targetHigh, currency)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.textMuted }}>Сейчас откладываете</Text>
            <Text style={{ color: meetsTargetLow ? theme.success : theme.danger, fontWeight: '700' }}>
              {formatCurrency(plan.currentMonthlySavings, currency)} ({formatPercent(plan.currentSavingsRate)})
            </Text>
          </View>
          <ProgressBar
            percent={plan.targetHigh > 0 ? (plan.currentMonthlySavings / plan.targetHigh) * 100 : 0}
            color={meetsTargetLow ? theme.success : theme.accent}
          />
          {meetsTargetLow ? (
            <Text style={{ color: theme.success, marginTop: spacing.sm, fontSize: 13, fontWeight: '600' }}>
              Вы уже откладываете в пределах рекомендованных 10–30% — так держать.
            </Text>
          ) : (
            <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontSize: 13 }}>
              Не хватает {formatCurrency(plan.shortfallToTargetLow, currency)}/мес до нижней границы (10%).
            </Text>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="Пока не хватает данных"
            subtitle="Добавьте хотя бы один доход, чтобы увидеть рекомендации по накоплениям"
          />
        </Card>
      )}

      {plan.discretionary.length > 0 && (
        <Card>
          <Text style={[styles.title, { color: theme.text }]}>На чём можно сэкономить</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
            Необязательные категории расходов — то, что обычно проще всего сократить без ущерба
            для базовых потребностей.
          </Text>
          {plan.discretionary.map((c) => (
            <View key={c.category} style={styles.row}>
              <Text style={{ color: theme.text }}>{c.category}</Text>
              <Text style={{ color: theme.textMuted }}>{formatCurrency(c.monthlyAvg, currency)}/мес</Text>
            </View>
          ))}
          <View style={[styles.row, styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Итого необязательных трат</Text>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {formatCurrency(plan.discretionaryMonthlyTotal, currency)}/мес
            </Text>
          </View>
          {!meetsTargetLow && plan.discretionaryMonthlyTotal > 0 && (
            <Text style={{ color: theme.textMuted, marginTop: spacing.sm, fontSize: 13 }}>
              Сократив эти траты примерно вдвое, вы сможете откладывать ещё{' '}
              {formatCurrency(plan.discretionaryMonthlyTotal / 2, currency)}/мес.
            </Text>
          )}
        </Card>
      )}

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
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: spacing.sm },
});
