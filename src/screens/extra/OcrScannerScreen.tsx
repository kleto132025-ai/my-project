import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { CategoryPicker } from '../../components/CategoryPicker';
import { AppButton } from '../../components/AppButton';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../theme/categoryIcons';
import { parseLocaleNumber } from '../../utils/parseNumber';

export function OcrScannerScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Продукты');

  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const currency = useSettingsStore((s) => s.currency);

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
    if (photo) setPhotoUri(photo.uri);
  };

  const handleSave = async () => {
    const parsed = parseLocaleNumber(amount);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    await addTransaction({ amount: parsed, category, type: 'expense', date: new Date(), currency, comment: 'Скан чека' });
    navigation.goBack();
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Text style={{ color: theme.text, marginBottom: spacing.md }}>
          Нужен доступ к камере, чтобы сканировать чеки
        </Text>
        <AppButton title="Разрешить доступ" onPress={requestPermission} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
        Сфотографируйте чек, затем укажите сумму вручную — автоматическое распознавание текста (OCR) появится в
        следующих обновлениях.
      </Text>
      {photoUri ? (
        <Card>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <FormInput label="Сумма по чеку" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <CategoryPicker categories={DEFAULT_EXPENSE_CATEGORIES} selected={category} onSelect={setCategory} />
          <AppButton title="Сохранить расход" onPress={handleSave} />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Переснять" variant="outline" onPress={() => setPhotoUri(null)} />
        </Card>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <AppButton title="Сделать фото" onPress={takePicture} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { gap: spacing.md },
  camera: { width: '100%', height: 320, borderRadius: radius.lg, overflow: 'hidden' },
  preview: { width: '100%', height: 200, borderRadius: radius.md, marginBottom: spacing.md },
});
