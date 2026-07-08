import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
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
import type { GoalPriority, WishStatus } from '../../types';

const STATUS_LABELS: Record<WishStatus, string> = {
  postponed: 'Откладываю',
  buying_soon: 'Куплю скоро',
  fulfilled: 'Исполнено',
};

export function WishlistScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const wishlistItems = useFinanceStore((s) => s.wishlistItems);
  const saveWishlistItem = useFinanceStore((s) => s.saveWishlistItem);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');

  const handleAdd = async () => {
    if (!name.trim() || !price) return;
    await saveWishlistItem({
      name: name.trim(),
      price: parseFloat(price),
      priority,
      status: 'postponed',
      savedAmount: 0,
    });
    setName('');
    setPrice('');
    setShowForm(false);
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
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {item.priority === 'high' ? 'Высокий' : item.priority === 'medium' ? 'Средний' : 'Низкий'}
              </Text>
            </View>
            <ProgressBar percent={calculateGoalProgress(item.savedAmount, item.price)} />
            <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
              Накоплено {formatCurrency(item.savedAmount, currency)} из {formatCurrency(item.price, currency)}
            </Text>
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
          <FormInput label="Цена" keyboardType="numeric" value={price} onChangeText={setPrice} />
          <SegmentedControl
            value={priority}
            onChange={setPriority}
            options={[
              { label: 'Высокий', value: 'high' },
              { label: 'Средний', value: 'medium' },
              { label: 'Низкий', value: 'low' },
            ]}
          />
          <AppButton title="Добавить в список" onPress={handleAdd} />
        </Card>
      ) : (
        <AppButton title="+ Добавить желание" variant="outline" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
});
