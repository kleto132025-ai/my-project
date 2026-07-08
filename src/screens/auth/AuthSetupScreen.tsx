import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppButton } from '../../components/AppButton';
import { FormInput } from '../../components/FormInput';
import { PinPad } from '../../components/PinPad';
import { ProgressBar } from '../../components/ProgressBar';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useBiometrics, authenticateBiometric } from '../../hooks/useBiometrics';
import type { AuthMethod } from '../../types';

type Step = 'method' | 'pin' | 'pinConfirm' | 'password' | 'passwordConfirm' | 'biometric' | 'recovery';

export function AuthSetupScreen() {
  const theme = useTheme();
  const setupAuth = useAuthStore((s) => s.setupAuth);
  const setRecoveryEmail = useSettingsStore((s) => s.setRecoveryEmail);
  const biometrics = useBiometrics();

  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<AuthMethod>('pin');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [password, setPassword] = useState('');
  const [firstPassword, setFirstPassword] = useState('');
  const [email, setEmail] = useState('');

  const chooseMethod = (m: AuthMethod) => {
    setMethod(m);
    if (m === 'pin') setStep('pin');
    else if (m === 'password') setStep('password');
    else setStep('biometric');
  };

  const onPinChange = (value: string) => {
    setPin(value);
    if (value.length === 4) {
      if (step === 'pin') {
        setFirstPin(value);
        setTimeout(() => {
          setPin('');
          setStep('pinConfirm');
        }, 150);
      } else if (step === 'pinConfirm') {
        if (value === firstPin) {
          setStep('recovery');
        } else {
          Alert.alert('PIN не совпадает', 'Попробуйте ещё раз');
          setPin('');
          setFirstPin('');
          setStep('pin');
        }
      }
    }
  };

  const handleBiometricEnroll = async () => {
    const success = await authenticateBiometric('Подтвердите личность для настройки входа');
    if (success) {
      setStep('pin'); // biometric still needs a PIN fallback
    } else {
      Alert.alert('Не удалось подтвердить', 'Настройте PIN как основной способ входа');
    }
  };

  const finishSetup = async () => {
    const secret = method === 'password' ? password : firstPin || pin;
    await setupAuth(method, secret);
    if (email.trim().length > 0) setRecoveryEmail(email.trim());
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={40} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Настройка входа</Text>
      </View>

      {step === 'method' && (
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Выберите способ входа в приложение</Text>
          <AppButton title="PIN-код (4 цифры)" onPress={() => chooseMethod('pin')} />
          <View style={{ height: spacing.sm }} />
          {biometrics.hasHardware && biometrics.hasFaceId && (
            <>
              <AppButton title="Face ID" variant="outline" onPress={() => chooseMethod('biometric')} />
              <View style={{ height: spacing.sm }} />
            </>
          )}
          {biometrics.hasHardware && biometrics.hasFingerprint && (
            <>
              <AppButton title="Touch ID" variant="outline" onPress={() => chooseMethod('biometric')} />
              <View style={{ height: spacing.sm }} />
            </>
          )}
          <AppButton title="Пароль" variant="outline" onPress={() => chooseMethod('password')} />
        </View>
      )}

      {step === 'biometric' && (
        <View style={styles.centered}>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Подтвердите биометрию, чтобы включить быстрый вход
          </Text>
          <AppButton title="Подтвердить" onPress={handleBiometricEnroll} />
        </View>
      )}

      {(step === 'pin' || step === 'pinConfirm') && (
        <View style={styles.centered}>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {step === 'pin' ? 'Придумайте PIN-код' : 'Повторите PIN-код'}
          </Text>
          <PinPad value={pin} onChange={onPinChange} />
        </View>
      )}

      {(step === 'password' || step === 'passwordConfirm') && (
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {step === 'password' ? 'Придумайте пароль' : 'Повторите пароль'}
          </Text>
          <FormInput
            label="Пароль"
            secureTextEntry
            value={step === 'password' ? password : password}
            onChangeText={setPassword}
          />
          {step === 'password' ? (
            <AppButton
              title="Далее"
              disabled={password.length < 4}
              onPress={() => {
                setFirstPassword(password);
                setPassword('');
                setStep('passwordConfirm');
              }}
            />
          ) : (
            <AppButton
              title="Подтвердить"
              disabled={password.length < 4}
              onPress={() => {
                if (password === firstPassword) {
                  setStep('recovery');
                } else {
                  Alert.alert('Пароли не совпадают', 'Попробуйте ещё раз');
                  setPassword('');
                  setFirstPassword('');
                  setStep('password');
                }
              }}
            />
          )}
        </View>
      )}

      {step === 'recovery' && (
        <View>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Email для восстановления доступа (необязательно)
          </Text>
          <FormInput
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <AppButton title="Завершить настройку" onPress={finishSetup} />
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <ProgressBar percent={stepToPercent(step)} />
      </View>
    </ScreenContainer>
  );
}

function stepToPercent(step: Step): number {
  switch (step) {
    case 'method':
      return 20;
    case 'pin':
    case 'password':
    case 'biometric':
      return 50;
    case 'pinConfirm':
    case 'passwordConfirm':
      return 75;
    case 'recovery':
      return 95;
    default:
      return 10;
  }
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg, marginTop: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  centered: { alignItems: 'center' },
});
