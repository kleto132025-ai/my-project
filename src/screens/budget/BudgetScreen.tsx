import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { CardActions } from '../../components/CardActions';
import { ProgressBar } from '../../components/ProgressBar';
import { FormInput } from '../../components/FormInput';
import { CategoryPicker } from '../../components/CategoryPicker';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { vibrateWarning } from '../../utils/haptics';
import { confirmDelete } from '../../utils/confirm';
import { useBudgetLimitsWithSpent } from '../../hooks/useFinancials';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../theme/categoryIcons';
import type { BudgetLimit, BudgetPeriod } from '../../types';
import { parseLocaleNumber } from '../../utils/parseNumber';

function daysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(lastDay - now.getDate() + 1, 1);
}

export function BudgetScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const vibrationEnabled = useSettingsStore((s) => s.vibrationEnabled);
  const notifications = useFinanceStore((s) => s.notifications);
  const saveBudgetLimit = useFinanceStore((s) => s.saveBudgetLimit);
  const removeBudgetLimit = useFinanceStore((s) => s.removeBudgetLimit);
  const addNotification = useFinanceStore((s) => s.addNotification);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [period] = useState<BudgetPeriod>('month');

  // "spent" в хранилище — это снимок на момент создания лимита (или демо-данные) и никогда
  // не обновляется при добавлении новых транзакций. useBudgetLimitsWithSpent пересчитывает
  // его из реальных трат за текущий календарный период, чтобы прогресс-бары не "замерзали".
  const budgetLimits = useBudgetLimitsWithSpent();

  useEffect(() => {
    budgetLimits.forEach(async (limit) => {
      const percent = (limit.spent / Math.max(limit.limit, 1)) * 100;
      const threshold = percent >= 100 ? '100' : percent >= 80 ? '80' : null;
      if (!threshold) return;

      // relatedId кодирует лимит + порог (80/100), поэтому при каждом ререндере экрана
      // не плодим дубликаты одного и того же предупреждения — только новое пересечение порога.
      const alreadyNotified = notifications.some(
        (n) => n.type === 'limit' && n.relatedId === `${limit.id}-${threshold}`
      );
      if (alreadyNotified) return;

      await addNotification({
        type: 'limit',
        title: threshold === '100' ? 'Лимит превышен' : 'Лимит почти исчерпан',
        message: `${limit.category}: потрачено ${Math.round(percent)}% от лимита`,
        date: new Date(),
        isRead: false,
        relatedScreen: 'Budget',
        relatedId: `${limit.id}-${threshold}`,
      });
      if (vibrationEnabled) await vibrateWarning();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetLimits]);

  const resetForm = () => {
    setCategory('');
    setLimitAmount('');
    setShowForm(false);
    setEditingId(null);
  };

  const startEditLimit = (limit: BudgetLimit) => {
    setCategory(limit.category);
    setLimitAmount(String(limit.limit));
    setEditingId(limit.id);
    setShowForm(true);
  };

  const handleAddLimit = async () => {
    if (!category.trim() || !limitAmount) return;
    await saveBudgetLimit({
      ...(editingId ? { id: editingId } : {}),
      category: category.trim(),
      limit: parseLocaleNumber(limitAmount),
      spent: 0,
      period,
    } as BudgetLimit);
    resetForm();
  };

  const isEditing = editingId !== null;
  const remainingDays = daysRemainingInMonth();

  return (
    <ScreenContainer>
      {budgetLimits.length === 0 ? (
        <EmptyState title="Лимиты не заданы" subtitle="Добавьте лимит по категории или общий бюджет" />
      ) : (
        budgetLimits.map((limit) => {
          const percent = (limit.spent / Math.max(limit.limit, 1)) * 100;
          const freeToday = (limit.limit - limit.spent) / remainingDays;
          const isOver = percent >= 100;
          const isWarning = percent >= 80 && percent < 100;
          return (
            <Card key={limit.id}>
              <View style={styles.rowBetween}>
                <Text style={[styles.title, { color: theme.text }]}>{limit.category}</Text>
                <View style={styles.headerRight}>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{Math.round(percent)}%</Text>
                  <CardActions onEdit={() => startEditLimit(limit)} onDelete={() => confirmDelete(limit.category, () => removeBudgetLimit(limit.id))} />
                </View>
              </View>
              <ProgressBar percent={percent} color={theme.accent} />
              <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
                {formatCurrency(limit.spent, currency)} из {formatCurrency(limit.limit, currency)}
              </Text>
              {(isOver || isWarning) && (
                <Text style={{ color: isOver ? theme.danger : theme.warning, marginTop: 4, fontSize: 12 }}>
                  {isOver ? 'Лимит превышен!' : 'Лимит почти исчерпан'}
                </Text>
              )}
              <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>
                Свободно на день: {formatCurrency(Math.max(freeToday, 0), currency)}
              </Text>
            </Card>
          );
        })
      )}

      {showForm ? (
        <Card>
          <CategoryPicker categories={DEFAULT_EXPENSE_CATEGORIES} selected={category} onSelect={setCategory} />
          <FormInput label="Лимит" keyboardType="decimal-pad" value={limitAmount} onChangeText={setLimitAmount} />
          <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить лимит'} onPress={handleAddLimit} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Отмена" variant="outline" onPress={resetForm} />
        </Card>
      ) : (
        <AppButton title="+ Добавить лимит" variant="outline" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
