import React from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';

export function WidgetsScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer>
      <Card>
        <EmptyState
          icon="apps-outline"
          title="Виджеты появятся после сборки приложения"
          subtitle="Виджеты для главного экрана (iOS через expo-widgets, Android через expo-home-widget) требуют нативной сборки и недоступны в Expo Go."
        />
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' }}>
          Планируемые виджеты: баланс, ближайший платёж, прогресс по цели.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
