import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface MiniCalendarProps {
  markedDates: Set<string>;
  onDayPress?: (date: Date) => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function MiniCalendar({ markedDates, onDayPress }: MiniCalendarProps) {
  const theme = useTheme();
  const [cursor, setCursor] = useState(new Date());

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cursor]);

  const today = new Date();

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={[styles.weekday, { color: theme.textMuted }]}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.dayCell} />;
            const isMarked = markedDates.has(dateKey(day));
            const isToday = dateKey(day) === dateKey(today);
            return (
              <Pressable key={di} style={styles.dayCell} onPress={() => onDayPress?.(day)}>
                <View
                  style={[
                    styles.dayCircle,
                    isToday && { borderWidth: 1, borderColor: theme.primary },
                    isMarked && { backgroundColor: theme.accent },
                  ]}
                >
                  <Text style={{ color: isMarked ? '#FFFFFF' : theme.text, fontSize: 13 }}>{day.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  monthLabel: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { width: 36, textAlign: 'center', fontSize: 11, marginBottom: 4 },
  dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
