import React from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface FormInputProps extends TextInputProps {
  label: string;
}

export function FormInput({ label, style, ...rest }: FormInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
});
