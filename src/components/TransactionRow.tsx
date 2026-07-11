import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';
import { getCategoryIcon } from '../theme/categoryIcons';
import { formatCurrency } from '../utils/format';
import { convertAmount } from '../utils/currency';
import { useSettingsStore } from '../store/settingsStore';
import type { Transaction } from '../types';

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  // Транзакция хранит валюту, в которой её создали; конвертируем в текущую отображаемую
  // валюту здесь же, чтобы строка была верной независимо от того, нормализовал ли её вызывающий код.
  const displayAmount = convertAmount(transaction.amount, transaction.currency, currency, rates);
  const isExpense = transaction.type === 'expense';
  const color = isExpense ? theme.expenseColor : theme.incomeColor;
  const iconName = getCategoryIcon(transaction.category, transaction.type);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.category, { color: theme.text }]} numberOfLines={1}>
          {transaction.category}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
          {format(transaction.date, 'd MMM, HH:mm', { locale: ru })}
          {transaction.comment ? ` · ${transaction.comment}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {isExpense ? '-' : '+'}
        {formatCurrency(displayAmount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  info: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', marginLeft: spacing.sm },
});
