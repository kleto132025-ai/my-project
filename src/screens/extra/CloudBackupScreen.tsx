import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Switch } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { AppButton } from '../../components/AppButton';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { exportJsonFile } from '../../utils/exportData';

export function CloudBackupScreen() {
  const theme = useTheme();
  const [autoBackup, setAutoBackup] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null);
  const state = useFinanceStore();

  const handleBackupNow = async () => {
    try {
      await exportJsonFile('finance-backup.json', {
        transactions: state.transactions,
        goals: state.goals,
        credits: state.credits,
        budgetLimits: state.budgetLimits,
        regularPayments: state.regularPayments,
        deposits: state.deposits,
        investments: state.investments,
        friendDebts: state.friendDebts,
        insurancePolicies: state.insurancePolicies,
        wishlistItems: state.wishlistItems,
        cashbackCards: state.cashbackCards,
        profile: state.profile,
        exportedAt: new Date().toISOString(),
      });
      setLastBackupAt(new Date());
    } catch {
      Alert.alert('Не удалось создать бэкап', 'Попробуйте ещё раз');
    }
  };

  return (
    <ScreenContainer>
      <Card>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Полная резервная копия всех данных приложения в формате JSON.
        </Text>
        <AppButton title="Создать бэкап сейчас" onPress={handleBackupNow} />
        {lastBackupAt && (
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm }}>
            Последний бэкап: {lastBackupAt.toLocaleString('ru-RU')}
          </Text>
        )}
      </Card>
      <Card>
        <View style={styles.row}>
          <Text style={{ color: theme.text, flex: 1 }}>Автобэкап раз в неделю</Text>
          <Switch value={autoBackup} onValueChange={setAutoBackup} />
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm }}>
          Настройка сохранена как предпочтение. Фоновое выполнение бэкапа в закрытом приложении требует
          дополнительной нативной сборки (expo-background-task) и появится в следующих обновлениях.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
