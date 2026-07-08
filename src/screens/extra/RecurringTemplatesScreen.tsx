import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { SegmentedControl } from '../../components/SegmentedControl';
import { CategoryPicker } from '../../components/CategoryPicker';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../theme/categoryIcons';
import type { TransactionType } from '../../types';

export function RecurringTemplatesScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const templates = useFinanceStore((s) => s.recurringTemplates);
  const saveTemplate = useFinanceStore((s) => s.saveRecurringTemplate);
  const addTransaction = useFinanceStore((s) => s.addTransaction);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [everyDay, setEveryDay] = useState('30');

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;

  const handleAdd = async () => {
    if (!name.trim() || !amount || !category.trim()) return;
    await saveTemplate({
      name: name.trim(),
      amount: parseFloat(amount),
      category: category.trim(),
      type,
      everyDay: parseInt(everyDay, 10) || 30,
    });
    setName('');
    setAmount('');
    setCategory('');
    setShowForm(false);
  };

  const handleCreateNow = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    await addTransaction({
      amount: template.amount,
      category: template.category,
      type: template.type,
      date: new Date(),
      currency,
      comment: `По шаблону: ${template.name}`,
    });
  };

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
        Шаблоны регулярных платежей. Напоминание приходит за 3 дня до примерной даты списания.
      </Text>
      {templates.length === 0 ? (
        <EmptyState title="Нет шаблонов" />
      ) : (
        templates.map((t) => (
          <Card key={t.id}>
            <View style={styles.rowBetween}>
              <Text style={[styles.title, { color: theme.text }]}>{t.name}</Text>
              <Text style={{ color: t.type === 'expense' ? theme.expenseColor : theme.incomeColor, fontWeight: '700' }}>
                {formatCurrency(t.amount, currency)}
              </Text>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {t.category} · каждые {t.everyDay} дн.
            </Text>
            <AppButton title="Создать транзакцию сейчас" variant="outline" onPress={() => handleCreateNow(t.id)} />
          </Card>
        ))
      )}

      {showForm ? (
        <Card>
          <SegmentedControl
            value={type}
            onChange={(v) => {
              setType(v);
              setCategory('');
            }}
            options={[
              { label: 'Расход', value: 'expense' },
              { label: 'Доход', value: 'income' },
            ]}
          />
          <FormInput label="Название" value={name} onChangeText={setName} placeholder="Коммуналка" />
          <FormInput label="Сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
          <CategoryPicker categories={categories} selected={category} onSelect={setCategory} />
          <FormInput label="Периодичность (дней)" keyboardType="numeric" value={everyDay} onChangeText={setEveryDay} />
          <AppButton title="Сохранить шаблон" onPress={handleAdd} />
        </Card>
      ) : (
        <AppButton title="+ Добавить шаблон" variant="outline" onPress={() => setShowForm(true)} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});
