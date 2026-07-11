import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppButton } from '../../components/AppButton';
import { FormInput } from '../../components/FormInput';
import { ProgressBar } from '../../components/ProgressBar';
import { CategoryPicker } from '../../components/CategoryPicker';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_INCOME_CATEGORIES } from '../../theme/categoryIcons';
import { parseLocaleNumber } from '../../utils/parseNumber';

const TOTAL_STEPS = 4;

export function OnboardingScreen() {
  const theme = useTheme();
  const [step, setStep] = useState(1);

  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const saveBudgetLimit = useFinanceStore((s) => s.saveBudgetLimit);
  const saveGoal = useFinanceStore((s) => s.saveGoal);
  const currency = useSettingsStore((s) => s.currency);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const authMethod = useAuthStore((s) => s.authMethod);

  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Зарплата');
  const [budgetLimit, setBudgetLimit] = useState(30000);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const skip = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  const handleAddIncome = async () => {
    const amount = parseLocaleNumber(incomeAmount);
    if (!Number.isNaN(amount) && amount > 0) {
      await addTransaction({
        amount,
        category: incomeCategory,
        type: 'income',
        date: new Date(),
        currency,
      });
    }
    next();
  };

  const handleSetBudget = async () => {
    await saveBudgetLimit({
      category: 'Общий лимит',
      limit: budgetLimit,
      spent: 0,
      period: 'month',
    });
    next();
  };

  const handleCreateGoal = async () => {
    const amount = parseLocaleNumber(goalAmount);
    if (goalName.trim().length > 0 && !Number.isNaN(amount) && amount > 0) {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 6);
      await saveGoal({
        name: goalName.trim(),
        targetAmount: amount,
        savedAmount: 0,
        deadline,
        priority: 'medium',
      });
    }
    next();
  };

  const finish = () => completeOnboarding();

  return (
    <ScreenContainer>
      <ProgressBar percent={(step / TOTAL_STEPS) * 100} />
      <View style={{ height: spacing.lg }} />

      {step === 1 && (
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Добавьте ваш первый доход</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Так приложение начнёт считать ваш баланс
          </Text>
          <FormInput
            label="Сумма"
            keyboardType="decimal-pad"
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            placeholder="Например, 85000"
          />
          <CategoryPicker
            categories={DEFAULT_INCOME_CATEGORIES}
            selected={incomeCategory}
            onSelect={setIncomeCategory}
          />
          <View style={{ height: spacing.md }} />
          <AppButton title="Добавить доход" onPress={handleAddIncome} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Пропустить" variant="outline" onPress={skip} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Установите бюджет</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Общий лимит расходов на месяц: {formatCurrency(budgetLimit, currency)}
          </Text>
          <Slider
            minimumValue={5000}
            maximumValue={200000}
            step={1000}
            value={budgetLimit}
            onValueChange={setBudgetLimit}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.accent}
          />
          <View style={{ height: spacing.md }} />
          <AppButton title="Продолжить" onPress={handleSetBudget} />
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Создайте цель</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Например, накопить на отпуск или технику
          </Text>
          <FormInput label="Название" value={goalName} onChangeText={setGoalName} placeholder="Путешествие" />
          <FormInput
            label="Сумма"
            keyboardType="decimal-pad"
            value={goalAmount}
            onChangeText={setGoalAmount}
            placeholder="100000"
          />
          <AppButton title="Создать цель" onPress={handleCreateGoal} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Пропустить" variant="outline" onPress={skip} />
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Настройте вход</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Текущий способ входа: {methodLabel(authMethod)}. Изменить его можно в любой момент в
            Настройках.
          </Text>
          <AppButton title="Готово, перейти к приложению" onPress={finish} />
        </View>
      )}
    </ScreenContainer>
  );
}

function methodLabel(method: string): string {
  if (method === 'pin') return 'PIN-код';
  if (method === 'password') return 'Пароль';
  return 'Биометрия';
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 14, marginBottom: spacing.lg },
});
