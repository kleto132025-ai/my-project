import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { navigateGlobal } from '../../navigation/navigationRef';
import type { AppNotification, NotificationType } from '../../types';

const ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  payment: 'card-outline',
  limit: 'alert-circle-outline',
  goal: 'flag-outline',
  report: 'document-text-outline',
  debt: 'people-outline',
};

// Часть экранов вложена во вкладки ("Tabs" на уровне бокового меню), часть — прямые пункты
// самого бокового меню. relatedScreen может ссылаться на любой из них, поэтому переход должен
// знать, в какую сторону идти — иначе получим ту же "not handled by any navigator", что уже
// была с переходом на "Budget" (единственную вкладку среди relatedScreen на момент фикса).
const TAB_SCREENS = new Set(['Dashboard', 'Transactions', 'Analytics', 'Budget']);

export function NotificationsScreen() {
  const theme = useTheme();
  const notifications = useFinanceStore((s) => s.notifications);
  const markNotificationRead = useFinanceStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useFinanceStore((s) => s.markAllNotificationsRead);
  const removeNotification = useFinanceStore((s) => s.removeNotification);

  const handlePress = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.relatedScreen) {
      // Обычный navigation.navigate(name) отсюда ничего не находит, так как "Уведомления" —
      // отдельная соседняя ветка бокового меню: переход всегда идёт через глобальный
      // navigationRef, с вложенными параметрами для экранов внутри вкладок.
      if (TAB_SCREENS.has(n.relatedScreen)) {
        navigateGlobal('Tabs', { screen: n.relatedScreen });
      } else {
        navigateGlobal(n.relatedScreen);
      }
    }
  };

  return (
    <ScreenContainer>
      <AppButton title="Прочитано всё" variant="outline" onPress={() => markAllNotificationsRead()} />
      <View style={{ height: spacing.md }} />
      {notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Уведомлений пока нет" />
      ) : (
        notifications.map((n) => (
          <Swipeable
            key={n.id}
            renderRightActions={() => (
              <Pressable style={[styles.deleteAction, { backgroundColor: theme.danger }]} onPress={() => removeNotification(n.id)}>
                <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
              </Pressable>
            )}
          >
            <Pressable onPress={() => handlePress(n)}>
              <Card style={!n.isRead && { borderLeftWidth: 3, borderLeftColor: theme.accent }}>
                <View style={styles.row}>
                  <Ionicons name={ICONS[n.type]} size={22} color={theme.primary} />
                  <View style={styles.textWrap}>
                    <Text style={[styles.title, { color: theme.text }]}>{n.title}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>{n.message}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                      {format(n.date, 'd MMM, HH:mm', { locale: ru })}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          </Swipeable>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
});
