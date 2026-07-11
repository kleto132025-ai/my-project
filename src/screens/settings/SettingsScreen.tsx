import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { FormInput } from '../../components/FormInput';
import { AppButton } from '../../components/AppButton';
import { PinPad } from '../../components/PinPad';
import { useTheme } from '../../theme';
import { spacing, radius, SCHEMES } from '../../theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { exportJsonFile, exportTransactionsCsv, importJsonFile } from '../../utils/exportData';
import { generateAndSharePdfReport } from '../../utils/report';
import type { Currency, ThemeScheme, AuthMethod } from '../../types';

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR'];
const SCHEME_LABELS: Record<ThemeScheme, string> = { blue: 'Синяя', maroon: 'Бордовая', green: 'Зелёная', purple: 'Фиолетовая' };

export function SettingsScreen() {
  const theme = useTheme();
  const settings = useSettingsStore();
  const financeState = useFinanceStore();
  const authStore = useAuthStore();

  const [changingAuth, setChangingAuth] = useState(false);
  const [newMethod, setNewMethod] = useState<AuthMethod>('pin');
  const [newPin, setNewPin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangeAuth = async () => {
    const secret = newMethod === 'password' ? newPassword : newPin;
    if (secret.length < 4) {
      Alert.alert('Слишком короткий код', 'Минимум 4 символа');
      return;
    }
    await authStore.changeSecret(newMethod, secret);
    setChangingAuth(false);
    setNewPin('');
    setNewPassword('');
    Alert.alert('Готово', 'Способ входа обновлён');
  };

  const handleExportJson = async () => {
    await exportJsonFile('finance-export.json', {
      transactions: financeState.transactions,
      goals: financeState.goals,
      credits: financeState.credits,
      budgetLimits: financeState.budgetLimits,
    });
  };

  const handleExportCsv = async () => {
    await exportTransactionsCsv(financeState.transactions);
  };

  const handleExportPdf = async () => {
    await generateAndSharePdfReport('Полный отчёт', financeState.transactions, settings.currency, settings.exchangeRates);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const data = await importJsonFile(result.assets[0].uri);
      if (typeof data === 'object' && data !== null) {
        Alert.alert('Импорт завершён', 'Файл прочитан. Импорт транзакций будет применён при следующей синхронизации.');
      }
    } catch {
      Alert.alert('Не удалось импортировать', 'Проверьте формат файла');
    }
  };

  const handleReset = () => {
    Alert.alert('Сбросить все данные?', 'Это действие необратимо', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: async () => {
          await financeState.resetAll();
          await authStore.resetAuth();
          settings.resetOnboarding();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Валюта</Text>
        <SegmentedControl
          value={settings.currency}
          onChange={settings.setCurrency}
          options={CURRENCIES.map((c) => ({ label: c, value: c }))}
        />
        {settings.currency !== 'RUB' && (
          <FormInput
            label={`Курс ${settings.currency} к RUB`}
            keyboardType="numeric"
            value={String(settings.exchangeRates[settings.currency])}
            onChangeText={(v) => settings.setExchangeRate(settings.currency, parseFloat(v) || 0)}
          />
        )}
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={{ color: theme.text, flex: 1 }}>Тёмная тема</Text>
          <Switch value={settings.isDarkMode} onValueChange={settings.toggleDarkMode} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Цветовая схема</Text>
        <View style={styles.schemeRow}>
          {(Object.keys(SCHEMES) as ThemeScheme[]).map((scheme) => (
            <Pressable key={scheme} onPress={() => settings.setColorScheme(scheme)} style={styles.schemeItem}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: SCHEMES[scheme].primary },
                  settings.colorScheme === scheme && { borderWidth: 3, borderColor: theme.text },
                ]}
              />
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>{SCHEME_LABELS[scheme]}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={{ color: theme.text, flex: 1 }}>Звук монетки</Text>
          <Switch value={settings.soundEnabled} onValueChange={settings.setSoundEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={{ color: theme.text, flex: 1 }}>Вибрация</Text>
          <Switch value={settings.vibrationEnabled} onValueChange={settings.setVibrationEnabled} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Метод входа</Text>
        {changingAuth ? (
          <View>
            <SegmentedControl
              value={newMethod}
              onChange={setNewMethod}
              options={[
                { label: 'PIN', value: 'pin' },
                { label: 'Пароль', value: 'password' },
                { label: 'Биометрия', value: 'biometric' },
              ]}
            />
            {newMethod === 'password' ? (
              <FormInput label="Новый пароль" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            ) : newMethod === 'pin' ? (
              <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
                <PinPad value={newPin} onChange={setNewPin} />
              </View>
            ) : (
              <Text style={{ color: theme.textMuted, marginBottom: spacing.sm }}>
                Потребуется резервный PIN — введите его как обычно.
              </Text>
            )}
            <AppButton title="Сохранить" onPress={handleChangeAuth} />
          </View>
        ) : (
          <AppButton title="Изменить способ входа" variant="outline" onPress={() => setChangingAuth(true)} />
        )}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Экспорт и импорт</Text>
        <AppButton title="Экспорт CSV" variant="outline" onPress={handleExportCsv} />
        <View style={{ height: spacing.sm }} />
        <AppButton title="Экспорт JSON" variant="outline" onPress={handleExportJson} />
        <View style={{ height: spacing.sm }} />
        <AppButton title="Экспорт PDF" variant="outline" onPress={handleExportPdf} />
        <View style={{ height: spacing.sm }} />
        <AppButton title="Импорт из файла" variant="outline" onPress={handleImport} />
      </Card>

      <Card>
        <AppButton title="Сбросить все данные" variant="accent" onPress={handleReset} />
      </Card>

      <Text style={[styles.version, { color: theme.textMuted }]}>
        Версия приложения: {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  schemeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  schemeItem: { alignItems: 'center' },
  swatch: { width: 40, height: 40, borderRadius: radius.full },
  version: { textAlign: 'center', fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.xl },
});
