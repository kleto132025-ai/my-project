import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatPercent } from '../../utils/format';
import { calculateForecast } from '../../utils/calculations';
import { generateAndSharePdfReport } from '../../utils/report';
import type { Transaction } from '../../types';

type Period = 'month' | 'quarter' | 'year';

const MAROON_PALETTE = ['#7F1D1D', '#991B1B', '#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5'];
const BLUE_PALETTE = ['#1E3A5F', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1E40AF'];

function periodStart(period: Period, offsetYears = 0): Date {
  const now = new Date();
  const date = new Date(now.getFullYear() - offsetYears, now.getMonth(), now.getDate());
  if (period === 'month') date.setDate(date.getDate() - 30);
  if (period === 'quarter') date.setDate(date.getDate() - 91);
  if (period === 'year') date.setDate(date.getDate() - 365);
  return date;
}

function inRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function groupByCategory(transactions: Transaction[]): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const t of transactions) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function AnalyticsScreen() {
  const theme = useTheme();
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const [period, setPeriod] = useState<Period>('month');

  const currentPeriodTx = useMemo(() => {
    const start = periodStart(period);
    const now = new Date();
    return transactions.filter((t) => inRange(t.date, start, now));
  }, [transactions, period]);

  const lastYearTx = useMemo(() => {
    const start = periodStart(period, 1);
    const now = new Date();
    const end = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return transactions.filter((t) => inRange(t.date, start, end));
  }, [transactions, period]);

  const expensesByCategory = useMemo(
    () => groupByCategory(currentPeriodTx.filter((t) => t.type === 'expense')),
    [currentPeriodTx]
  );
  const incomesByCategory = useMemo(
    () => groupByCategory(currentPeriodTx.filter((t) => t.type === 'income')),
    [currentPeriodTx]
  );

  const totalExpense = expensesByCategory.reduce((s, c) => s + c.total, 0);
  const totalIncome = incomesByCategory.reduce((s, c) => s + c.total, 0);

  const expensePieData = expensesByCategory.map((c, i) => ({
    value: c.total,
    color: MAROON_PALETTE[i % MAROON_PALETTE.length],
    text: totalExpense > 0 ? formatPercent((c.total / totalExpense) * 100) : '',
  }));
  const incomePieData = incomesByCategory.map((c, i) => ({
    value: c.total,
    color: BLUE_PALETTE[i % BLUE_PALETTE.length],
    text: totalIncome > 0 ? formatPercent((c.total / totalIncome) * 100) : '',
  }));

  const currentExpenseTotal = currentPeriodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastYearExpenseTotal = lastYearTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const yoyBarData = [
    { value: lastYearExpenseTotal, label: 'Прошлый год', frontColor: theme.accent },
    { value: currentExpenseTotal, label: 'Текущий', frontColor: theme.secondary },
  ];

  const balanceTrend = useMemo(() => {
    const points: { value: number; label: string }[] = [];
    const now = new Date();
    let running = 0;
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthTx = transactions.filter((t) => t.date >= monthDate && t.date < nextMonthDate);
      const net = monthTx.reduce((s, t) => (t.type === 'income' ? s + t.amount : t.type === 'expense' ? s - t.amount : s), 0);
      running += net;
      points.push({ value: running, label: monthDate.toLocaleDateString('ru-RU', { month: 'short' }) });
    }
    return points;
  }, [transactions]);

  const yearForecast = calculateForecast(transactions, 12);
  const allCategories = useMemo(
    () => groupByCategory(currentPeriodTx).sort((a, b) => b.total - a.total),
    [currentPeriodTx]
  );
  const totalAll = allCategories.reduce((s, c) => s + c.total, 0);

  const handleGenerateReport = async () => {
    try {
      await generateAndSharePdfReport(
        `Отчёт за ${period === 'month' ? 'месяц' : period === 'quarter' ? 'квартал' : 'год'}`,
        currentPeriodTx,
        currency
      );
    } catch {
      Alert.alert('Не удалось сформировать отчёт', 'Попробуйте ещё раз позже');
    }
  };

  return (
    <ScreenContainer>
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={[
          { label: 'Месяц', value: 'month' },
          { label: 'Квартал', value: 'quarter' },
          { label: 'Год', value: 'year' },
        ]}
      />

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Расходы по категориям</Text>
        {expensePieData.length === 0 ? (
          <EmptyState title="Нет расходов за период" />
        ) : (
          <View style={styles.pieWrap}>
            <PieChart data={expensePieData} donut radius={80} innerRadius={50} showText textColor="#fff" textSize={10} />
          </View>
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Доходы по категориям</Text>
        {incomePieData.length === 0 ? (
          <EmptyState title="Нет доходов за период" />
        ) : (
          <View style={styles.pieWrap}>
            <PieChart data={incomePieData} donut radius={80} innerRadius={50} showText textColor="#fff" textSize={10} />
          </View>
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Сравнение с прошлым годом</Text>
        <BarChart
          data={yoyBarData}
          barWidth={36}
          spacing={40}
          roundedTop
          noOfSections={4}
          yAxisTextStyle={{ color: theme.textMuted }}
          xAxisLabelTextStyle={{ color: theme.textMuted }}
        />
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Динамика баланса</Text>
        <LineChart
          data={balanceTrend}
          color={theme.secondary}
          thickness={3}
          curved
          areaChart
          startFillColor={theme.secondary}
          endFillColor={theme.accent}
          startOpacity={0.3}
          endOpacity={0.05}
          yAxisTextStyle={{ color: theme.textMuted }}
          xAxisLabelTextStyle={{ color: theme.textMuted }}
        />
        <Text style={{ color: theme.textMuted, marginTop: spacing.sm }}>
          Если так пойдёт дальше — баланс через год:{' '}
          <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(yearForecast, currency)}</Text>
        </Text>
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Куда уходят деньги</Text>
        {allCategories.length === 0 ? (
          <EmptyState title="Нет данных за период" />
        ) : (
          allCategories.map((c) => (
            <View key={c.category} style={styles.categoryRow}>
              <Text style={{ color: theme.text }}>{c.category}</Text>
              <Text style={{ color: theme.textMuted }}>
                {formatCurrency(c.total, currency)} · {formatPercent(totalAll > 0 ? (c.total / totalAll) * 100 : 0)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <AppButton title="Сформировать отчёт" onPress={handleGenerateReport} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  pieWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
