import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '../store/financeStore';
import { navigateGlobal } from '../navigation/navigationRef';

export function NotificationBellButton() {
  const unreadCount = useFinanceStore((s) => s.notifications.filter((n) => !n.isRead).length);

  return (
    <Pressable onPress={() => navigateGlobal('Notifications')} hitSlop={12} style={styles.wrapper}>
      <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginRight: 16 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
