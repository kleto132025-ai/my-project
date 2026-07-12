import React from 'react';
import { View, Pressable, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

// При 4+ вкладках равная ширина (flex: 1) на узком экране не оставляет слову вроде
// "Календарь" места и оно переносится посередине на новую строку. Уменьшать шрифт мы не
// хотим, поэтому вместо этого при большом числе вкладок отдаём каждой её естественную
// ширину и позволяем всей строке прокручиваться по горизонтали — как обычные вкладки.
// При 2-3 вкладках (переключатели вроде "Расход/Доход") поведение не меняется — они
// по-прежнему растягиваются на всю ширину поровну.
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const scrollable = options.length > 3;
  const wrapperStyle = [styles.wrapper, { backgroundColor: theme.isDark ? '#1E293B' : '#E2E8F0' }];

  const segments = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        style={[styles.segment, scrollable && styles.segmentAuto, active && { backgroundColor: theme.primary }]}
      >
        <Text style={[styles.label, { color: active ? '#FFFFFF' : theme.textMuted }]}>{opt.label}</Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={wrapperStyle}>
        {segments}
      </ScrollView>
    );
  }

  return <View style={wrapperStyle}>{segments}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentAuto: {
    flex: 0,
    paddingHorizontal: spacing.md,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
