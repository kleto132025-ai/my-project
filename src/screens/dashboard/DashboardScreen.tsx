import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import {
  useFreeFunds,
  useTodaySummary,
  useRecentTransactions,
  useTopCategories,
  useForecast,
} from '../../hooks/useFinancials';
import type { Transaction } from '../../types';

const renderTransactionRow = ({ item }: { item: Transaction }) => <TransactionRow transaction={item} />;
const keyExtractor = (item: Transaction) => item.id;

export function DashboardScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const budgetLimits = useFinanceStore((s) => s.budgetLimits);

  const freeFunds = useFreeFunds();
  const today = useTodaySummary();
  const recentTransactions = useRecentTransactions(5);
  const topExpenses = useTopCategories('expense', 3);
  const topIncomes = useTopCategories('income', 3);
  const forecast = useForecast(1);

  return (
    <ScreenContainer>
      <Card style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
        <Text style={styles.balanceLabel}>Свободные средства</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(freeFunds, currency)}</Text>
        <Text style={styles.balanceHint}>Доходы − Расходы − Кредиты − Отчисления в цели</Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Сегодня</Text>
        <View style={styles.todayRow}>
          <View style={styles.todayItem}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={theme.incomeColor} />
            <Text style={[styles.todayLabel, { color: theme.textMuted }]}>Доход</Text>
            <Text style={[styles.todayAmount, { color: theme.incomeColor }]}>
              {formatCurrency(today.income, currency)}
            </Text>
          </View>
          <View style={styles.todayItem}>
            <Ionicons name="arrow-up-circle-outline" size={20} color={theme.expenseColor} />
            <Text style={[styles.todayLabel, { color: theme.textMuted }]}>Расход</Text>
            <Text style={[styles.todayAmount, { color: theme.expenseColor }]}>
              {formatCurrency(today.expense, currency)}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Последние транзакции</Text>
        {recentTransactions.length === 0 ? (
          <EmptyState title="Пока нет транзакций" subtitle="Добавьте первый доход или расход" />
        ) : (
          // Список короткий (максимум 5 записей) и вложен в общий ScrollView экрана,
          // поэтому собственный скролл FlatList отключён — виртуализация здесь не нужна,
          // а сам FlatList используется ради единообразного рендера строк списком.
          <FlatList
            data={recentTransactions}
            keyExtractor={keyExtractor}
            renderItem={renderTransactionRow}
            scrollEnabled={false}
          />
        )}
      </Card>

      {budgetLimits.length > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Лимиты по категориям</Text>
          {budgetLimits.map((limit) => (
            <View key={limit.id} style={styles.limitRow}>
              <View style={styles.limitHeader}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{limit.category}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {formatCurrency(limit.spent, currency)} / {formatCurrency(limit.limit, currency)}
                </Text>
              </View>
              <ProgressBar percent={(limit.spent / Math.max(limit.limit, 1)) * 100} color={theme.accent} />
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>На что больше уходит</Text>
        {topExpenses.length === 0 ? (
          <EmptyState title="Нет данных о расходах" />
        ) : (
          topExpenses.map((c) => (
            <View key={c.category} style={styles.categoryRow}>
              <Text style={{ color: theme.text }}>{c.category}</Text>
              <Text style={{ color: theme.expenseColor, fontWeight: '700' }}>
                {formatCurrency(c.total, currency)} ({formatPercent(c.percent)})
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Откуда доход</Text>
        {topIncomes.length === 0 ? (
          <EmptyState title="Нет данных о доходах" />
        ) : (
          topIncomes.map((c) => (
            <View key={c.category} style={styles.categoryRow}>
              <Text style={{ color: theme.text }}>{c.category}</Text>
              <Text style={{ color: theme.incomeColor, fontWeight: '700' }}>
                {formatCurrency(c.total, currency)} ({formatPercent(c.percent)})
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Финансовый прогноз</Text>
        <Text style={{ color: theme.textMuted, lineHeight: 20 }}>
          Если продолжите в том же духе, через месяц баланс будет:{' '}
          <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(forecast, currency)}</Text>
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balanceCard: { padding: spacing.lg },
  balanceLabel: { color: '#E2E8F0', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  balanceHint: { color: '#CBD5E1', fontSize: 11, marginTop: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  todayRow: { flexDirection: 'row', justifyContent: 'space-around' },
  todayItem: { alignItems: 'center', gap: 4 },
  todayLabel: { fontSize: 12 },
  todayAmount: { fontSize: 16, fontWeight: '700' },
  limitRow: { marginBottom: spacing.sm },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
