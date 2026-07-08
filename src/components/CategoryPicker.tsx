import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface CategoryPickerProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryPicker({ categories, selected, onSelect }: CategoryPickerProps) {
  const theme = useTheme();
  const [customValue, setCustomValue] = useState('');
  const isCustomSelected = selected.length > 0 && !categories.includes(selected);

  return (
    <View>
      <Text style={[styles.label, { color: theme.textMuted }]}>Категория</Text>
      <View style={styles.chipsWrap}>
        {categories.map((category) => {
          const active = category === selected;
          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.isDark ? '#1E293B' : '#EEF2F7',
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 13, fontWeight: '600' }}>
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, { color: theme.textMuted, marginTop: spacing.sm }]}>Своя категория</Text>
      <TextInput
        placeholder="Например: Ремонт машины"
        placeholderTextColor={theme.textMuted}
        value={isCustomSelected ? selected : customValue}
        onChangeText={(text) => {
          setCustomValue(text);
          onSelect(text);
        }}
        style={[
          styles.customInput,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
});
