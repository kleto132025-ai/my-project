import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import { normalizeTransactionsToCurrency } from '../../utils/currency';
import { TRANSFER_CATEGORIES } from '../../theme/categoryIcons';
import type { Transaction } from '../../types';

type Granularity = 'month' | 'quarter' | 'year';

const PERIOD_DAYS: Record<Granularity, number> = { month: 30, quarter: 91, year: 365 };

function rangeForOffset(granularity: Granularity, offset: number): { start: Date; end: Date } {
  const len = PERIOD_DAYS[granularity];
  const now = new Date();
  const end = new Date(now.getTime() - offset * len * 24 * 3600 * 1000);
  const start = new Date(end.getTime() - len * 24 * 3600 * 1000);
  return { start, end };
}

function expensesByCategory(transactions: Transaction[], range: { start: Date; end: Date }) {
  const filtered = transactions.filter(
    (t) => t.type === 'expense' && !TRANSFER_CATEGORIES.includes(t.category) && t.date >= range.start && t.date <= range.end
  );
  const map = new Map<string, number>();
  for (const t of filtered) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return map;
}

const OFFSET_OPTIONS = [
  { label: 'Текущий', value: '0' },
  { label: '1 назад', value: '1' },
  { label: '2 назад', value: '2' },
];

export function PeriodComparisonScreen() {
  const theme = useTheme();
  const rawTransactions = useFinanceStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const transactions = useMemo(
    () => normalizeTransactionsToCurrency(rawTransactions, currency, rates),
    [rawTransactions, currency, rates]
  );

  const [granularity, setGranularity] = useState<Granularity>('month');
  const [offset1, setOffset1] = useState('0');
  const [offset2, setOffset2] = useState('1');

  const range1 = useMemo(() => rangeForOffset(granularity, parseInt(offset1, 10)), [granularity, offset1]);
  const range2 = useMemo(() => rangeForOffset(granularity, parseInt(offset2, 10)), [granularity, offset2]);

  const map1 = useMemo(() => expensesByCategory(transactions, range1), [transactions, range1]);
  const map2 = useMemo(() => expensesByCategory(transactions, range2), [transactions, range2]);

  const allCategories = useMemo(() => {
    const set = new Set<string>([...map1.keys(), ...map2.keys()]);
    return Array.from(set).sort((a, b) => (map1.get(b) ?? 0) - (map1.get(a) ?? 0));
  }, [map1, map2]);

  const total1 = Array.from(map1.values()).reduce((s, v) => s + v, 0);
  const total2 = Array.from(map2.values()).reduce((s, v) => s + v, 0);
  const totalChange = total2 > 0 ? ((total1 - total2) / total2) * 100 : 0;

  const barData = allCategories.slice(0, 6).flatMap((category) => [
    { value: map1.get(category) ?? 0, label: category.slice(0, 6), frontColor: theme.secondary, spacing: 2 },
    { value: map2.get(category) ?? 0, frontColor: theme.accent },
  ]);

  return (
    <ScreenContainer>
      <SegmentedControl
        value={granularity}
        onChange={setGranularity}
        options={[
          { label: 'Месяц', value: 'month' },
          { label: 'Квартал', value: 'quarter' },
          { label: 'Год', value: 'year' },
        ]}
      />

      <Card>
        <Text style={[styles.label, { color: theme.textMuted }]}>Период 1</Text>
        <SegmentedControl value={offset1} onChange={setOffset1} options={OFFSET_OPTIONS} />
        <Text style={[styles.label, { color: theme.textMuted }]}>Период 2</Text>
        <SegmentedControl value={offset2} onChange={setOffset2} options={OFFSET_OPTIONS} />
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Расходы по категориям — столбцы рядом</Text>
        {allCategories.length === 0 ? (
          <EmptyState title="Нет данных для сравнения" />
        ) : (
          <BarChart
            data={barData}
            barWidth={16}
            spacing={20}
            roundedTop
            noOfSections={4}
            yAxisTextStyle={{ color: theme.textMuted }}
            xAxisLabelTextStyle={{ color: theme.textMuted, fontSize: 9 }}
          />
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Таблица сравнения</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.categoryCell, { color: theme.textMuted }]}>Категория</Text>
          <Text style={[styles.tableCell, { color: theme.textMuted }]}>Период 1</Text>
          <Text style={[styles.tableCell, { color: theme.textMuted }]}>Период 2</Text>
          <Text style={[styles.tableCell, { color: theme.textMuted }]}>Изм.</Text>
        </View>
        {allCategories.map((category) => {
          const v1 = map1.get(category) ?? 0;
          const v2 = map2.get(category) ?? 0;
          const change = v2 > 0 ? ((v1 - v2) / v2) * 100 : v1 > 0 ? 100 : 0;
          return (
            <View key={category} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.categoryCell, { color: theme.text }]} numberOfLines={1}>
                {category}
              </Text>
              <Text style={[styles.tableCell, { color: theme.text }]}>{formatCurrency(v1, currency)}</Text>
              <Text style={[styles.tableCell, { color: theme.text }]}>{formatCurrency(v2, currency)}</Text>
              <Text style={[styles.tableCell, { color: change > 0 ? theme.danger : theme.success }]}>
                {change > 0 ? '+' : ''}
                {formatPercent(change)}
              </Text>
            </View>
          );
        })}
        <Text style={{ color: theme.text, marginTop: spacing.sm, fontWeight: '700' }}>
          Всего расходов: {formatCurrency(total1, currency)} vs {formatCurrency(total2, currency)} (
          {totalChange > 0 ? '+' : ''}
          {formatPercent(totalChange)})
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  tableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tableRow: { flexDirection: 'row', paddingVertical: 6 },
  tableCell: { flex: 1, fontSize: 12 },
  categoryCell: { flex: 1.4 },
});
