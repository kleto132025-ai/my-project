import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppButton } from '../../components/AppButton';
import { FormInput } from '../../components/FormInput';
import { PinPad } from '../../components/PinPad';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { authenticateBiometric } from '../../hooks/useBiometrics';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function AuthLockScreen() {
  const theme = useTheme();
  const authMethod = useAuthStore((s) => s.authMethod);
  const verifySecret = useAuthStore((s) => s.verifySecret);
  const unlockWithBiometric = useAuthStore((s) => s.unlockWithBiometric);
  const resetAuth = useAuthStore((s) => s.resetAuth);
  const isLockedOut = useAuthStore((s) => s.isLockedOut);
  const failedAttempts = useAuthStore((s) => s.failedAttempts);

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const tick = () => setRemainingMs(useAuthStore.getState().lockoutRemainingMs());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const tryBiometric = useCallback(async () => {
    const success = await authenticateBiometric('Войдите в приложение');
    if (success) unlockWithBiometric();
  }, [unlockWithBiometric]);

  useEffect(() => {
    if (authMethod === 'biometric' && !isLockedOut()) {
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locked = isLockedOut();

  const onPinChange = async (value: string) => {
    setPin(value);
    if (value.length === 4) {
      const ok = await verifySecret(value);
      if (!ok) {
        Alert.alert('Неверный PIN', `Осталось попыток: ${Math.max(3 - (failedAttempts + 1), 0)}`);
        setPin('');
      }
    }
  };

  const onPasswordSubmit = async () => {
    const ok = await verifySecret(password);
    if (!ok) {
      Alert.alert('Неверный пароль', `Осталось попыток: ${Math.max(3 - (failedAttempts + 1), 0)}`);
      setPassword('');
    }
  };

  const handleForgot = () => {
    Alert.alert(
      'Восстановление доступа',
      'Код для сброса отправлен на ваш email (демо-режим). Сбросить вход и настроить заново?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: () => resetAuth() },
      ]
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Вход в приложение</Text>

        {locked ? (
          <Text style={[styles.lockedText, { color: theme.danger }]}>
            Слишком много попыток. Попробуйте через {formatCountdown(remainingMs)}
          </Text>
        ) : authMethod === 'password' ? (
          <View style={styles.passwordBlock}>
            <FormInput
              label="Пароль"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={onPasswordSubmit}
            />
            <AppButton title="Войти" onPress={onPasswordSubmit} />
          </View>
        ) : (
          <View style={styles.pinBlock}>
            <PinPad value={pin} onChange={onPinChange} />
            {authMethod === 'biometric' && (
              <AppButton title="Использовать биометрию" variant="outline" onPress={tryBiometric} />
            )}
          </View>
        )}

        <AppButton title="Забыли?" variant="outline" onPress={handleForgot} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  lockedText: { fontSize: 15, textAlign: 'center', marginVertical: spacing.lg },
  pinBlock: { alignItems: 'center', gap: spacing.md },
  passwordBlock: { width: '100%' },
});
