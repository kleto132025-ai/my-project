import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useSettingsStore, type ProfileKind } from '../../store/settingsStore';

const PROFILES: { key: ProfileKind; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'personal', label: 'Личный', icon: 'person-outline' },
  { key: 'business', label: 'Бизнес', icon: 'briefcase-outline' },
  { key: 'family', label: 'Семейный', icon: 'people-outline' },
];

export function MultiProfileScreen() {
  const theme = useTheme();
  const activeProfile = useSettingsStore((s) => s.activeProfile);
  const setActiveProfile = useSettingsStore((s) => s.setActiveProfile);

  return (
    <ScreenContainer>
      <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
        Переключение профиля меняет отображаемую метку в приложении. Полное разделение данных между
        профилями появится вместе с облачной синхронизацией.
      </Text>
      {PROFILES.map((p) => {
        const active = p.key === activeProfile;
        return (
          <Pressable key={p.key} onPress={() => setActiveProfile(p.key)}>
            <Card style={[styles.row, active && { borderWidth: 2, borderColor: theme.primary }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.primary + '1A' }]}>
                <Ionicons name={p.icon} size={20} color={theme.primary} />
              </View>
              <Text style={{ color: theme.text, flex: 1, fontWeight: '600' }}>{p.label}</Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
            </Card>
          </Pressable>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
