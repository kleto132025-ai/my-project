import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export function AppButton({ title, onPress, variant = 'primary', disabled, loading }: AppButtonProps) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'accent' ? theme.accent : 'transparent';
  const borderColor = variant === 'outline' ? theme.primary : 'transparent';
  const textColor = variant === 'outline' ? theme.primary : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 },
        (disabled || pressed) && { opacity: 0.7 },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
