import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme';

interface FloatingAddButtonProps {
  onPress: () => void;
  color: string;
}

export function FloatingAddButton({ onPress, color }: FloatingAddButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.fab, { backgroundColor: color }]}>
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
