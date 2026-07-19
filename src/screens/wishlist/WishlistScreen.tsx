import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { CardActions } from '../../components/CardActions';
import { ProgressBar } from '../../components/ProgressBar';
import { FormInput } from '../../components/FormInput';
import { SegmentedControl } from '../../components/SegmentedControl';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { calculateGoalProgress } from '../../utils/calculations';
import { confirmDelete } from '../../utils/confirm';
import type { GoalPriority, WishStatus, WishlistItem } from '../../types';
import { parseLocaleNumber } from '../../utils/parseNumber';

const STATUS_LABELS: Record<WishStatus, string> = {
  postponed: 'Откладываю',
  buying_soon: 'Куплю скоро',
  fulfilled: 'Исполнено',
};

export function WishlistScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const wishlistItems = useFinanceStore((s) => s.wishlistItems);
  const goals = useFinanceStore((s) => s.goals);
  const saveWishlistItem = useFinanceStore((s) => s.saveWishlistItem);
  const removeWishlistItem = useFinanceStore((s) => s.removeWishlistItem);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [goalId, setGoalId] = useState('');

  const resetForm = () => {
    setName('');
    setPrice('');
    setSavedAmount('');
    setGoalId('');
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (item: WishlistItem) => {
    setName(item.name);
    setPrice(String(item.price));
    setSavedAmount(String(item.savedAmount));
    setPriority(item.priority);
    setGoalId(item.goalId ?? '');
    setEditingId(item.id);
    setShowForm(true);
  };

  const isEditing = editingId !== null;

  // Сумма, накопленная на конкретное желание, — своя (savedAmount) или, если желание привязано
  // к финансовой цели, берётся из самой цели (с учётом суммы партнёра для общих целей), чтобы не
  // приходилось дублировать одно и то же накопление вручную в двух местах.
  const effectiveSaved = (item: WishlistItem): number => {
    if (!item.goalId) return item.savedAmount;
    const goal = goals.find((g) => g.id === item.goalId);
    if (!goal) return item.savedAmount;
    return goal.savedAmount + (goal.isShared ? goal.partnerSavedAmount ?? 0 : 0);
  };

  const handleAdd = async () => {
    if (!name.trim() || !price) return;
    const existing = editingId ? wishlistItems.find((w) => w.id === editingId) : undefined;
    await saveWishlistItem({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      price: parseLocaleNumber(price),
      priority,
      status: existing?.status ?? 'postponed',
      savedAmount: savedAmount ? parseLocaleNumber(savedAmount) : existing?.savedAmount ?? 0,
      goalId: goalId || undefined,
    } as WishlistItem);
    resetForm();
  };

  const cycleStatus = async (id: string) => {
    const item = wishlistItems.find((w) => w.id === id);
    if (!item) return;
    const order: WishStatus[] = ['postponed', 'buying_soon', 'fulfilled'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    await saveWishlistItem({ ...item, status: next });
  };

  return (
    <ScreenContainer>
      {wishlistItems.length === 0 ? (
        <EmptyState title="Список пуст" subtitle="Добавьте то, что хотите купить" />
      ) : (
        wishlistItems.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowBetween}>
              <Text style={[styles.title, { color: theme.text }]}>{item.name}</Text>
              <View style={styles.headerRight}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {item.priority === 'high' ? 'Высокий' : item.priority === 'medium' ? 'Средний' : 'Низкий'}
                </Text>
                <CardActions onEdit={() => startEdit(item)} onDelete={() => confirmDelete(item.name, () => removeWishlistItem(item.id))} />
              </View>
            </View>
            <ProgressBar percent={calculateGoalProgress(effectiveSaved(item), item.price)} />
            <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
              Накоплено {formatCurrency(effectiveSaved(item), currency)} из {formatCurrency(item.price, currency)}
            </Text>
            {item.goalId && (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Привязано к цели «{goals.find((g) => g.id === item.goalId)?.name ?? '—'}»
              </Text>
            )}
            <Pressable onPress={() => cycleStatus(item.id)}>
              <Text style={{ color: theme.accent, fontWeight: '700', marginTop: 6 }}>
                {STATUS_LABELS[item.status]} · изменить
              </Text>
            </Pressable>
          </Card>
        ))
      )}

      {showForm ? (
        <Card>
          <FormInput label="Название" value={name} onChangeText={setName} placeholder="Наушники" />
          <FormInput label="Цена" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
          {goals.length > 0 && (
            <>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
                Привязать к финансовой цели (накопленная сумма будет браться из неё)
              </Text>
              <SegmentedControl
                value={goalId}
                onChange={setGoalId}
                options={[{ label: 'Не привязано', value: '' }, ...goals.map((g) => ({ label: g.name, value: g.id }))]}
              />
            </>
          )}
          {!goalId && (
            <FormInput label="Накоплено" keyboardType="decimal-pad" value={savedAmount} onChangeText={setSavedAmount} placeholder="0" />
          )}
          <SegmentedControl
            value={priority}
            onChange={setPriority}
            options={[
              { label: 'Высокий', value: 'high' },
              { label: 'Средний', value: 'medium' },
              { label: 'Низкий', value: 'low' },
            ]}
          />
          <AppButton title={isEditing ? 'Сохранить изменения' : 'Добавить в список'} onPress={handleAdd} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Отмена" variant="outline" onPress={resetForm} />
        </Card>
      ) : (
        <AppButton title="+ Добавить желание" variant="outline" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', flexShrink: 1, marginRight: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
});
