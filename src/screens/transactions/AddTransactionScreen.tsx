import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormInput } from '../../components/FormInput';
import { CategoryPicker } from '../../components/CategoryPicker';
import { DateField } from '../../components/DateField';
import { AppButton } from '../../components/AppButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../theme/categoryIcons';
import { suggestCategory } from '../../utils/categorize';
import { validateTransaction, isDuplicateTransaction } from '../../utils/validation';
import { playCoinSound } from '../../utils/sound';
import { vibrateSuccess } from '../../utils/haptics';
import type { Transaction, TransactionType } from '../../types';
import { parseLocaleNumber } from '../../utils/parseNumber';

export function AddTransactionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editingTransaction: Transaction | undefined = route.params?.transaction;
  const initialType: TransactionType = editingTransaction?.type ?? route.params?.type ?? 'expense';

  const currency = useSettingsStore((s) => s.currency);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const vibrationEnabled = useSettingsStore((s) => s.vibrationEnabled);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const editTransaction = useFinanceStore((s) => s.editTransaction);
  const transactions = useFinanceStore((s) => s.transactions);

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState(editingTransaction ? String(editingTransaction.amount) : '');
  const [category, setCategory] = useState(editingTransaction?.category ?? '');
  const [comment, setComment] = useState(editingTransaction?.comment ?? '');
  const [date, setDate] = useState(editingTransaction?.date ?? new Date());
  const [suggested, setSuggested] = useState<string | undefined>();

  useEffect(() => {
    navigation.setOptions({ title: editingTransaction ? 'Изменить транзакцию' : 'Новая транзакция' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const accentColor = type === 'expense' ? theme.expenseColor : theme.incomeColor;

  const handleCommentChange = (text: string) => {
    setComment(text);
    const guess = suggestCategory(text, type === 'transfer' ? 'expense' : type);
    setSuggested(guess);
  };

  const canSave = useMemo(() => amount.length > 0 && category.trim().length > 0, [amount, category]);

  const handleSave = async () => {
    const parsedAmount = parseLocaleNumber(amount);
    const candidate = {
      id: editingTransaction?.id ?? 'pending',
      amount: parsedAmount,
      category: category.trim(),
      type,
      date,
      comment: comment.trim() || undefined,
      currency: editingTransaction?.currency ?? currency,
    };

    if (!validateTransaction(candidate)) {
      Alert.alert('Проверьте данные', 'Укажите корректную сумму и категорию');
      return;
    }
    // Предупреждение, а не жёсткий запрет: одинаковая сумма/категория в течение минуты обычно
    // и правда случайная повторная отправка одной и той же записи, но это не всегда так —
    // например, два одинаковых по сумме кофе подряд — вполне реальная ситуация, и раньше
    // такую вторую запись невозможно было добавить вообще никак.
    if (!editingTransaction && isDuplicateTransaction(candidate, transactions)) {
      Alert.alert(
        'Похожая запись уже есть',
        'Такая транзакция уже была добавлена недавно. Всё равно добавить ещё одну?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Всё равно добавить', onPress: () => performSave(candidate, parsedAmount) },
        ]
      );
      return;
    }

    await performSave(candidate, parsedAmount);
  };

  const performSave = async (candidate: Transaction, parsedAmount: number) => {
    if (editingTransaction) {
      await editTransaction(candidate);
    } else {
      await addTransaction({
        amount: parsedAmount,
        category: category.trim(),
        type,
        date,
        comment: comment.trim() || undefined,
        currency,
      });
      if (soundEnabled) playCoinSound();
      if (vibrationEnabled) {
        // Транзакция уже сохранена к этому моменту — сбой вибрации (неподдерживаемое
        // устройство/эмулятор) не должен мешать закрыть экран.
        try {
          await vibrateSuccess();
        } catch {
          // не критично — запись уже добавлена
        }
      }
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer>
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
      <FormInput
        label="Сумма"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
      />
      <FormInput
        label="Комментарий"
        value={comment}
        onChangeText={handleCommentChange}
        placeholder="Необязательно"
      />
      {suggested && suggested !== category && (
        <View style={styles.suggestion}>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Предложенная категория: </Text>
          <Text
            onPress={() => setCategory(suggested)}
            style={{ color: accentColor, fontWeight: '700', fontSize: 13 }}
          >
            {suggested}
          </Text>
        </View>
      )}
      <CategoryPicker categories={categories} selected={category} onSelect={setCategory} />
      <DateField label="Дата" value={date} onChange={setDate} />
      <View style={{ height: spacing.sm }} />
      <AppButton title={editingTransaction ? 'Сохранить изменения' : 'Сохранить'} onPress={handleSave} disabled={!canSave} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  suggestion: { flexDirection: 'row', marginBottom: spacing.sm, marginTop: -spacing.sm },
});
