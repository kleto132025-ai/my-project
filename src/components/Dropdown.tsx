import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface DropdownOption {
  label: string;
  value: string | null;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
}

// Простой выпадающий список без сторонних зависимостей — только React Native Modal, чтобы
// не тянуть в проект пакет-пикер. Нужен там, где список вариантов слишком длинный для строки
// чипов (например, десятки категорий расходов) и чипы начинают занимать пол-экрана.
export function Dropdown({ options, value, onChange, placeholder }: DropdownProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: theme.border, backgroundColor: theme.card }]}
      >
        <Text style={{ color: value ? theme.text : theme.textMuted, fontSize: 14 }}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <ScrollView style={styles.list}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value ?? '__all__'}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={[styles.option, active && { backgroundColor: theme.isDark ? '#1E293B' : '#EEF2F7' }]}
                  >
                    <Text style={{ color: active ? theme.primary : theme.text, fontWeight: active ? '700' : '400' }}>
                      {o.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={theme.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '60%', paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
});
