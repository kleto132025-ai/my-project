import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { spacing } from '../theme';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  title: { fontSize: 15, fontWeight: '600', marginTop: spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
