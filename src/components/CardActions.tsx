import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface CardActionsProps {
  onEdit?: () => void;
  onDelete: () => void;
}

export function CardActions({ onEdit, onDelete }: CardActionsProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={8} style={styles.icon}>
          <Ionicons name="pencil-outline" size={18} color={theme.textMuted} />
        </Pressable>
      )}
      <Pressable onPress={onDelete} hitSlop={8} style={styles.icon}>
        <Ionicons name="trash-outline" size={18} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14 },
  icon: { padding: 2 },
});
