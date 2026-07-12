import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { CardActions } from '../../components/CardActions';
import { SegmentedControl } from '../../components/SegmentedControl';
import { FormInput } from '../../components/FormInput';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { parseLocaleNumber } from '../../utils/parseNumber';
import { confirmDelete } from '../../utils/confirm';
import { requestNotificationPermissions, scheduleRegularPaymentReminder } from '../../utils/notifications';
import type { RegularPayment, TransactionType } from '../../types';

// Обязательные регулярные платежи не привязанные к конкретному кредиту/подписке в других
// разделах — ЖКХ, интернет, детский сад, курсы и т.п. У части таких платежей нет фиксированной
// даты, а есть окно оплаты (ЖКХ обычно можно оплатить с 1 по 10 число) — для них включается
// "Диапазон дат оплаты", и напоминание/календарь показывают весь диапазон, а не одну дату.
export function RegularPaymentsScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const regularPayments = useFinanceStore((s) => s.regularPayments);
  const saveRegularPayment = useFinanceStore((s) => s.saveRegularPayment);
  const removeRegularPayment = useFinanceStore((s) => s.removeRegularPayment);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [hasRange, setHasRange] = useState(false);
  const [dayFrom, setDayFrom] = useState('1');
  const [dayTo, setDayTo] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategory('');
    setType('expense');
    setHasRange(false);
    setDayFrom('1');
    setDayTo('10');
    setIsActive(true);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (p: RegularPayment) => {
    setName(p.name);
    setAmount(String(p.amount));
    setCategory(p.category);
    setType(p.type);
    setHasRange(p.dayOfMonthEnd != null);
    setDayFrom(String(p.dayOfMonth));
    setDayTo(String(p.dayOfMonthEnd ?? p.dayOfMonth));
    setIsActive(p.isActive);
    setEditingId(p.id);
    setShowForm(true);
  };

  const clampDay = (raw: string, fallback: number) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(Math.max(n, 1), 31);
  };

  const handleSave = async () => {
    if (!name.trim() || !amount) return;
    const from = clampDay(dayFrom, 1);
    const to = hasRange ? Math.max(clampDay(dayTo, from), from) : from;

    const payment = {
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      amount: parseLocaleNumber(amount),
      category: category.trim() || 'Другое',
      dayOfMonth: from,
      dayOfMonthEnd: hasRange ? to : undefined,
      isActive,
      type,
    } as RegularPayment;

    await saveRegularPayment(payment);

    // Напоминание планируется только при создании — чтобы редактирование существующего
    // платежа (например, смена суммы после подорожания ЖКХ) не плодило дублирующиеся
    // повторяющиеся уведомления поверх уже запланированного. Обёрнуто в try/catch: платёж
    // к этому моменту уже сохранён, и сбой планирования уведомления (нет разрешения,
    // особенности конкретного устройства) не должен мешать закрыть форму — иначе кнопка
    // "Сохранить" выглядела бы неработающей, хотя запись на самом деле уже добавилась.
    if (!editingId && isActive) {
      try {
        const granted = await requestNotificationPermissions();
        if (granted) await scheduleRegularPaymentReminder(payment);
      } catch {
        // платёж уже сохранён — напоминание можно не ставить, это не повод блокировать форму
      }
    }
    resetForm();
  };

  const isEditing = editingId !== null;

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
        Платежи, которые не относятся к кредитам или подпискам, но повторяются каждый месяц —
        ЖКХ, интернет и ТВ, детский сад, курсы, кружки и т.п. Появляются в календаре обязательств
        на главном экране и в разделе «Кредиты и платежи», а если включено напоминание —
        присылают уведомление.
      </Text>

      {regularPayments.length === 0 ? (
        <EmptyState title="Нет регулярных платежей" subtitle="Добавьте первый — например, ЖКХ или интернет" />
      ) : (
        regularPayments.map((p) => (
          <Card key={p.id}>
            <View style={styles.rowBetween}>
              <Text style={[styles.itemTitle, { color: theme.text, opacity: p.isActive ? 1 : 0.5 }]}>{p.name}</Text>
              <View style={styles.headerRight}>
                <Text style={{ color: p.type === 'expense' ? theme.expenseColor : theme.incomeColor, fontWeight: '700' }}>
                  {formatCurrency(p.amount, currency)}
                </Text>
                <CardActions onEdit={() => startEdit(p)} onDelete={() => confirmDelete(p.name, () => removeRegularPayment(p.id))} />
              </View>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {p.category} ·{' '}
              {p.dayOfMonthEnd ? `можно оплатить ${p.dayOfMonth}–${p.dayOfMonthEnd} числа` : `оплата ${p.dayOfMonth} числа`}
              {!p.isActive ? ' · отключён' : ''}
            </Text>
          </Card>
        ))
      )}

      {showForm ? (
        <Card>
          <FormInput label="Название" value={name} onChangeText={setName} placeholder="ЖКХ" />
          <FormInput label="Сумма" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <FormInput label="Категория" value={category} onChangeText={setCategory} placeholder="Жильё" />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Тип</Text>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { label: 'Расход', value: 'expense' },
              { label: 'Доход', value: 'income' },
            ]}
          />
          <View style={styles.rowBetween}>
            <Text style={{ color: theme.text, flexShrink: 1 }}>Диапазон дат оплаты (например, ЖКХ)</Text>
            <Switch value={hasRange} onValueChange={setHasRange} />
          </View>
          {hasRange ? (
            <View style={styles.dayRangeRow}>
              <View style={styles.dayRangeField}>
                <FormInput label="С числа" keyboardType="number-pad" value={dayFrom} onChangeText={setDayFrom} />
              </View>
              <View style={styles.dayRangeField}>
                <FormInput label="По число" keyboardType="number-pad" value={dayTo} onChangeText={setDayTo} />
              </View>
            </View>
          ) : (
            <FormInput label="День оплаты" keyboardType="number-pad" value={dayFrom} onChangeText={setDayFrom} />
          )}
          <View style={styles.rowBetween}>
            <Text style={{ color: theme.text }}>Активен</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
          <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить платёж'} onPress={handleSave} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Отмена" variant="outline" onPress={resetForm} />
        </Card>
      ) : (
        <AppButton title="+ Добавить платёж" variant="outline" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayRangeRow: { flexDirection: 'row', gap: spacing.sm },
  dayRangeField: { flex: 1 },
});
