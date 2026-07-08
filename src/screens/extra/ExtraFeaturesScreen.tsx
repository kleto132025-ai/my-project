import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';

const ITEMS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; route: string; subtitle: string }[] = [
  { icon: 'scan-outline', title: 'Сканер чеков', route: 'OcrScanner', subtitle: 'Фото чека → ручной ввод суммы' },
  { icon: 'mic-outline', title: 'Голосовой ввод', route: 'VoiceInput', subtitle: 'Добавление транзакций голосом' },
  { icon: 'cloud-upload-outline', title: 'Облачный бэкап', route: 'CloudBackup', subtitle: 'Экспорт и автосохранение данных' },
  { icon: 'apps-outline', title: 'Виджеты', route: 'Widgets', subtitle: 'Доступны после сборки приложения' },
  { icon: 'people-circle-outline', title: 'Семейный бюджет', route: 'FamilySharing', subtitle: 'Совместное ведение через QR-код' },
  { icon: 'bulb-outline', title: 'ИИ-аналитика', route: 'AiInsights', subtitle: 'Советы по экономии' },
  { icon: 'repeat-outline', title: 'Шаблоны трат', route: 'RecurringTemplates', subtitle: 'Регулярные платежи и напоминания' },
  { icon: 'calculator-outline', title: 'Налоговый вычет', route: 'TaxCalculator', subtitle: 'Расчёт вычета 13%' },
  { icon: 'trending-up-outline', title: 'Планировщик финансов', route: 'FinancialPlanner', subtitle: 'Прогноз баланса' },
  { icon: 'people-outline', title: 'Мультипрофиль', route: 'MultiProfile', subtitle: 'Личный / бизнес / семейный' },
];

export function ExtraFeaturesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <ScreenContainer>
      {ITEMS.map((item) => (
        <Pressable key={item.route} onPress={() => navigation.navigate(item.route)}>
          <Card style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.primary + '1A' }]}>
              <Ionicons name={item.icon} size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Card>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700' },
});
