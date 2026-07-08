import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TransactionRow } from '../../components/TransactionRow';
import { EmptyState } from '../../components/EmptyState';
import { FloatingAddButton } from '../../components/FloatingAddButton';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../theme/categoryIcons';
import type { TransactionType } from '../../types';

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
  const transactions = useFinanceStore((s) => s.transactions);

  const [type, setType] = useState<TransactionType>('expense');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const accentColor = type === 'expense' ? theme.expenseColor : theme.incomeColor;

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

  return (
    <View style={{ flex: 1 }}>
      <ScreenContainer>
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

        <Card>
          {filtered.length === 0 ? (
            <EmptyState title="Транзакций не найдено" subtitle="Измените фильтры или добавьте новую запись" />
          ) : (
            filtered.map((t) => <TransactionRow key={t.id} transaction={t} />)
          )}
        </Card>
      </ScreenContainer>
      <FloatingAddButton color={accentColor} onPress={() => navigation.navigate('AddTransaction', { type })} />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
