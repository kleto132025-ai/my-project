import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { AppButton } from '../../components/AppButton';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatNumber } from '../../utils/format';
import { calculateBalance } from '../../utils/calculations';

export function ProfileScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const profile = useFinanceStore((s) => s.profile);
  const saveProfile = useFinanceStore((s) => s.saveProfile);
  const transactions = useFinanceStore((s) => s.transactions);
  const achievements = useFinanceStore((s) => s.achievements);
  const cashbackCards = useFinanceStore((s) => s.cashbackCards);
  const goals = useFinanceStore((s) => s.goals);

  const [nameInput, setNameInput] = useState(profile?.name ?? '');
  const [editingName, setEditingName] = useState(false);

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const balance = calculateBalance(transactions);

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true });
    if (!result.canceled && profile) {
      await saveProfile({ ...profile, avatarUri: result.assets[0].uri });
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
    if (!result.canceled && profile) {
      await saveProfile({ ...profile, avatarUri: result.assets[0].uri });
    }
  };

  const handleSaveName = async () => {
    if (!profile || !nameInput.trim()) return;
    await saveProfile({ ...profile, name: nameInput.trim() });
    setEditingName(false);
  };

  if (!profile) return null;

  return (
    <ScreenContainer>
      <Card style={styles.avatarCard}>
        {profile.avatarUri ? (
          <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={36} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.avatarButtons}>
          <Pressable onPress={pickFromLibrary} style={styles.avatarButton}>
            <Ionicons name="images-outline" size={20} color={theme.primary} />
          </Pressable>
          <Pressable onPress={pickFromCamera} style={styles.avatarButton}>
            <Ionicons name="camera-outline" size={20} color={theme.primary} />
          </Pressable>
        </View>

        {editingName ? (
          <View style={{ width: '100%', marginTop: spacing.md }}>
            <FormInput label="Имя" value={nameInput} onChangeText={setNameInput} />
            <AppButton title="Сохранить" onPress={handleSaveName} />
          </View>
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]}>{profile.name}</Text>
            <Ionicons name="pencil-outline" size={16} color={theme.textMuted} />
          </Pressable>
        )}
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
          В приложении с {format(profile.registeredAt, 'd MMMM yyyy', { locale: ru })}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Статистика</Text>
        <View style={styles.statsRow}>
          <StatItem label="Транзакций" value={String(transactions.length)} theme={theme} />
          <StatItem label="Баланс" value={formatCurrency(balance, currency)} theme={theme} />
          <StatItem label="Накоплено" value={formatCurrency(totalSaved, currency)} theme={theme} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Достижения</Text>
        <View style={styles.badgesWrap}>
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[
                styles.badge,
                { backgroundColor: a.isUnlocked ? theme.accent : theme.isDark ? '#334155' : '#E2E8F0' },
              ]}
            >
              <Ionicons name="ribbon-outline" size={18} color={a.isUnlocked ? '#FFFFFF' : theme.textMuted} />
              <Text style={{ color: a.isUnlocked ? '#FFFFFF' : theme.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' }}>
                {a.title}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Привязанные карты</Text>
        {cashbackCards.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Нет привязанных карт</Text>
        ) : (
          cashbackCards.map((c) => (
            <View key={c.id} style={styles.cardRow}>
              <Text style={{ color: theme.text }}>{c.name}</Text>
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>{formatNumber(c.cashbackPercent)}%</Text>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

function StatItem({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarCard: { alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: radius.full },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  avatarButton: { padding: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  name: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  badgesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: 84, height: 84, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
});
