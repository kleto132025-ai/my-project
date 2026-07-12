import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { SwipeableTransactionRow } from '../../components/SwipeableTransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { FloatingAddButton } from '../../components/FloatingAddButton';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useFreeFunds } from '../../hooks/useFinancials';
import { confirmDelete } from '../../utils/confirm';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../theme/categoryIcons';
import type { Transaction, TransactionType } from '../../types';

type PeriodFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

function isWithinPeriod(date: Date, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  const now = new Date();
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (period === 'week') return diffDays <= 7;
  if (period === 'month') return diffDays <= 31;
  if (period === 'quarter') return diffDays <= 92;
  return diffDays <= 366;
}

export function TransactionsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  // "Доходы" и "Расходы" в боковом меню открывают этот же экран с разным начальным типом
  // (initialParams в MainDrawer.tsx) — так пользователю не нужно помнить про переключатель
  // внутри, если он хочет сразу попасть в нужный список.
  const route = useRoute<any>();
  const transactions = useFinanceStore((s) => s.transactions);
  const removeTransaction = useFinanceStore((s) => s.removeTransaction);
  const currency = useSettingsStore((s) => s.currency);
  const cashBalance = useFreeFunds();

  const [type, setType] = useState<TransactionType>(route.params?.type ?? 'expense');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const accentColor = type === 'expense' ? theme.expenseColor : theme.incomeColor;

  // Список транзакций может расти до сотен записей, поэтому фильтрация мемоизируется,
  // а рендер отдан FlatList — он виртуализирует строки и не держит все элементы в памяти одновременно.
  const filtered = useMemo(() => {
    return transactions
      .filter((t) => t.type === type)
      .filter((t) => isWithinPeriod(t.date, period))
      .filter((t) => !selectedCategory || t.category === selectedCategory)
      .filter((t) => {
        if (!debouncedSearch.trim()) return true;
        const query = debouncedSearch.toLowerCase();
        return (
          t.category.toLowerCase().includes(query) || (t.comment ?? '').toLowerCase().includes(query)
        );
      });
  }, [transactions, type, period, selectedCategory, debouncedSearch]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <SwipeableTransactionRow
        transaction={item}
        onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
        onDelete={() => confirmDelete(item.category, () => removeTransaction(item.id))}
      />
    ),
    [navigation, removeTransaction]
  );
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const filtersHeader = (
    <View>
      <View style={[styles.balanceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>Остаток ДС по текущим счетам</Text>
        <Text style={{ color: cashBalance < 0 ? theme.danger : theme.text, fontSize: 18, fontWeight: '800' }}>
          {formatCurrency(cashBalance, currency)}
        </Text>
      </View>

      <SegmentedControl
        value={type}
        onChange={(v) => {
          setType(v);
          setSelectedCategory(null);
        }}
        options={[
          { label: 'Расходы', value: 'expense' },
          { label: 'Доходы', value: 'income' },
        ]}
      />

      <TextInput
        placeholder="Поиск по категории или комментарию"
        placeholderTextColor={theme.textMuted}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.search,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
        ]}
      />

      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={[
          { label: 'Неделя', value: 'week' },
          { label: 'Месяц', value: 'month' },
          { label: 'Квартал', value: 'quarter' },
          { label: 'Год', value: 'year' },
          { label: 'Все', value: 'all' },
        ]}
      />

      <View style={styles.chipsRow}>
        {categories.map((c) => {
          const active = selectedCategory === c;
          return (
            <Pressable
              key={c}
              onPress={() => setSelectedCategory(active ? null : c)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? accentColor : theme.isDark ? '#1E293B' : '#EEF2F7',
                  borderColor: active ? accentColor : theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }}>
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer scroll={false}>
        {filtersHeader}
        <View style={[styles.listCard, { backgroundColor: theme.card }]}>
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={
              <EmptyState title="Транзакций не найдено" subtitle="Измените фильтры или добавьте новую запись" />
            }
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScreenContainer>
      <FloatingAddButton color={accentColor} onPress={() => navigation.navigate('AddTransaction', { type })} />
    </View>
  );
}

const styles = StyleSheet.create({
  balanceRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  listCard: {
    flex: 1,
    borderRadius: radius.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  listContent: { padding: spacing.md, flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
});
