import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { MiniCalendar } from '../../components/MiniCalendar';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format';
import {
  useFreeFunds,
  useTodaySummary,
  useRecentTransactions,
  useTopCategories,
  useForecast,
  useBudgetLimitsWithSpent,
  useDebtSummary,
  useInvestmentsSummary,
  useNetWorth,
  useMortgageAssets,
  useUpcomingPayments,
  useObligationEvents,
} from '../../hooks/useFinancials';
import type { Transaction } from '../../types';

const renderTransactionRow = ({ item }: { item: Transaction }) => <TransactionRow transaction={item} />;
const keyExtractor = (item: Transaction) => item.id;

export function DashboardScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const budgetLimits = useBudgetLimitsWithSpent();

  const freeFunds = useFreeFunds();
  const today = useTodaySummary();
  const recentTransactions = useRecentTransactions(5);
  const topExpenses = useTopCategories('expense', 3);
  const topIncomes = useTopCategories('income', 3);
  const forecast = useForecast(1);
  const debtSummary = useDebtSummary();
  const investmentsSummary = useInvestmentsSummary();
  const netWorth = useNetWorth();
  const mortgageAssets = useMortgageAssets();
  const upcomingPayments = useUpcomingPayments(7);
  const eventsByDate = useObligationEvents();
  const markedDates = useMemo(() => new Set(eventsByDate.keys()), [eventsByDate]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const selectedDateEvents = selectedDate ? eventsByDate.get(dateKey(selectedDate)) ?? [] : [];

  const isNegative = freeFunds < 0;

  return (
    <ScreenContainer>
      <Card style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
        <Text style={styles.balanceLabel}>Свободные средства</Text>
        <Text style={[styles.balanceAmount, isNegative && { color: '#FCA5A5' }]}>
          {formatCurrency(freeFunds, currency)}
        </Text>
        {isNegative ? (
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#FCA5A5" />
            <Text style={styles.warningText}>Расходы превышают доходы</Text>
          </View>
        ) : (
          <Text style={styles.balanceHint}>Доходы − Расходы</Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Общий капитал</Text>
        <Text style={{ color: netWorth.total >= 0 ? theme.success : theme.danger, fontSize: 22, fontWeight: '800' }}>
          {formatCurrency(netWorth.total, currency)}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2, marginBottom: spacing.sm }}>
          Только ликвидные накопления — без ипотеки и кредитов
        </Text>
        <View style={styles.debtRow}>
          <Text style={{ color: theme.text }}>Остаток ДС</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(netWorth.cash, currency)}</Text>
        </View>
        <View style={styles.debtRow}>
          <Text style={{ color: theme.text }}>Накопительные счета</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>
            {formatCurrency(netWorth.savingsAccounts, currency)}
          </Text>
        </View>
        <View style={styles.debtRow}>
          <Text style={{ color: theme.text }}>Вклады</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(netWorth.deposits, currency)}</Text>
        </View>
        <View style={styles.debtRow}>
          <Text style={{ color: theme.text }}>Инвестиции</Text>
          <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(netWorth.investments, currency)}</Text>
        </View>
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

      {upcomingPayments.length > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>На этой неделе</Text>
          {upcomingPayments.map((p) => (
            <View key={p.id} style={styles.debtRow}>
              <View style={styles.upcomingLabelRow}>
                <Text style={{ color: theme.text }}>{p.label}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{p.date.toLocaleDateString('ru-RU')}</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(p.amount, currency)}</Text>
            </View>
          ))}
        </Card>
      )}

      {markedDates.size > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Календарь обязательств</Text>
          <MiniCalendar markedDates={markedDates} onDayPress={setSelectedDate} />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm }}>
            Отмечены даты платежей по кредитам, регулярным платежам, долгам и страховкам.
            Нажмите на дату, чтобы увидеть, какой платёж на неё приходится.
          </Text>
          {selectedDate && (
            <View style={[styles.calendarFootnote, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {selectedDateEvents.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>На эту дату платежей не запланировано</Text>
              ) : (
                selectedDateEvents.map((event, i) => (
                  <View key={i} style={styles.debtRow}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, flexShrink: 1 }}>{event.label}</Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(event.amount, currency)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Card>
      )}

      {debtSummary.totalRemaining > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Остаток долга</Text>
          {debtSummary.creditsRemaining > 0 && (
            <View style={styles.debtRow}>
              <View style={styles.debtLabelRow}>
                <Ionicons name="card-outline" size={16} color={theme.accent} />
                <Text style={{ color: theme.text }}>Кредиты</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {formatCurrency(debtSummary.creditsRemaining, currency)}
              </Text>
            </View>
          )}
          {debtSummary.mortgageRemaining > 0 && (
            <View style={styles.debtRow}>
              <View style={styles.debtLabelRow}>
                <Ionicons name="home-outline" size={16} color={theme.accent} />
                <Text style={{ color: theme.text }}>Ипотека</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {formatCurrency(debtSummary.mortgageRemaining, currency)}
              </Text>
            </View>
          )}
          {debtSummary.creditsRemaining > 0 && debtSummary.mortgageRemaining > 0 && (
            <View style={[styles.debtRow, styles.debtTotalRow, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Итого</Text>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>
                {formatCurrency(debtSummary.totalRemaining, currency)}
              </Text>
            </View>
          )}
        </Card>
      )}

      {mortgageAssets.length > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Актив по ипотеке</Text>
          {mortgageAssets.map((m, i) => (
            <View key={m.id} style={i > 0 ? [styles.mortgageAssetBlock, { borderTopColor: theme.border }] : undefined}>
              {mortgageAssets.length > 1 && (
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>{m.name}</Text>
              )}
              <View style={styles.debtRow}>
                <View style={styles.debtLabelRow}>
                  <Ionicons name="home-outline" size={16} color={theme.accent} />
                  <Text style={{ color: theme.text }}>Текущая стоимость</Text>
                </View>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(m.currentValue, currency)}</Text>
              </View>
              <View style={styles.debtRow}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>Останется при продаже сегодня</Text>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{formatCurrency(m.saleProceeds, currency)}</Text>
              </View>
              <View style={[styles.debtRow, styles.debtTotalRow, { borderTopColor: theme.border }]}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>Прирост с учётом расходов</Text>
                <Text style={{ color: m.netProfit >= 0 ? theme.success : theme.danger, fontWeight: '800' }}>
                  {m.netProfit >= 0 ? '+' : ''}
                  {formatCurrency(m.netProfit, currency)} ({m.netProfit >= 0 ? '+' : ''}
                  {formatNumber(m.netProfitPercent)}%)
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {investmentsSummary.totalValue > 0 && (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Инвестиции</Text>
          <View style={styles.debtRow}>
            <View style={styles.debtLabelRow}>
              <Ionicons name="trending-up-outline" size={16} color={theme.secondary} />
              <Text style={{ color: theme.text }}>Текущая стоимость портфеля</Text>
            </View>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {formatCurrency(investmentsSummary.totalValue, currency)}
            </Text>
          </View>
          {investmentsSummary.totalPayouts > 0 && (
            <View style={[styles.debtRow, styles.debtTotalRow, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.textMuted, fontSize: 13 }}>Получено дивидендов и купонов</Text>
              <Text style={{ color: theme.secondary, fontWeight: '800' }}>
                {formatCurrency(investmentsSummary.totalPayouts, currency)}
              </Text>
            </View>
          )}
        </Card>
      )}

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
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  warningText: { color: '#FCA5A5', fontSize: 11, flexShrink: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  todayRow: { flexDirection: 'row', justifyContent: 'space-around' },
  todayItem: { alignItems: 'center', gap: 4 },
  todayLabel: { fontSize: 12 },
  todayAmount: { fontSize: 16, fontWeight: '700' },
  limitRow: { marginBottom: spacing.sm },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  debtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  debtLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  upcomingLabelRow: { gap: 2 },
  debtTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: spacing.sm },
  mortgageAssetBlock: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  calendarFootnote: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
