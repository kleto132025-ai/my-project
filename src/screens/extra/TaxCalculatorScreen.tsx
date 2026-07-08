import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { calculateTaxDeduction } from '../../utils/calculations';

export function TaxCalculatorScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const [amount, setAmount] = useState('');

  const parsed = parseFloat(amount) || 0;
  const deduction = calculateTaxDeduction(parsed);

  return (
    <ScreenContainer>
      <Card>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Расчёт налогового вычета 13% (например, по ИИС или расходам на лечение/обучение)
        </Text>
        <FormInput label="Сумма расходов" keyboardType="numeric" value={amount} onChangeText={setAmount} placeholder="100000" />
        <Text style={[styles.result, { color: theme.text }]}>
          Вычет: <Text style={{ color: theme.accent, fontWeight: '800' }}>{formatCurrency(deduction, currency)}</Text>
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  result: { fontSize: 16, marginTop: spacing.sm },
});
