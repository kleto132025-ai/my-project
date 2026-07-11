import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { TransactionRow } from './TransactionRow';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme';
import type { Transaction } from '../types';

interface SwipeableTransactionRowProps {
  transaction: Transaction;
  onPress: () => void;
  onDelete: () => void;
}

export function SwipeableTransactionRow({ transaction, onPress, onDelete }: SwipeableTransactionRowProps) {
  const theme = useTheme();

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable style={[styles.deleteAction, { backgroundColor: theme.danger }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        </Pressable>
      )}
    >
      <Pressable onPress={onPress}>
        <View style={{ backgroundColor: theme.card }}>
          <TransactionRow transaction={transaction} />
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
});
