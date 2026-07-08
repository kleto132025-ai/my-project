import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ value, onChange, length = 4 }: PinPadProps) {
  const theme = useTheme();

  const handlePress = (key: string) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key && value.length < length) {
      onChange(value + key);
    }
  };

  return (
    <View>
      <View style={styles.dots}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: theme.primary },
              i < value.length && { backgroundColor: theme.primary },
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, index) => (
          <Pressable
            key={index}
            onPress={() => handlePress(key)}
            disabled={key === ''}
            style={({ pressed }) => [
              styles.key,
              pressed && key !== '' && { backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' },
            ]}
          >
            {key === 'del' ? (
              <Ionicons name="backspace-outline" size={22} color={theme.text} />
            ) : (
              <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: spacing.xl },
  dot: { width: 16, height: 16, borderRadius: radius.full, borderWidth: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 264, alignSelf: 'center' },
  key: {
    width: 88,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  keyText: { fontSize: 24, fontWeight: '600' },
});
