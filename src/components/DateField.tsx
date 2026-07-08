import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useTheme } from '../theme';
import { spacing, radius } from '../theme';

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.field, { borderColor: theme.border, backgroundColor: theme.card }]}
      >
        <Text style={{ color: theme.text, fontSize: 15 }}>{format(value, 'd MMMM yyyy', { locale: ru })}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) onChange(selectedDate);
            if (Platform.OS === 'android') setShowPicker(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
});
