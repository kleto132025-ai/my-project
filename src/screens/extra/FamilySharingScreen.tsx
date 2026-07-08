import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { AppButton } from '../../components/AppButton';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function FamilySharingScreen() {
  const theme = useTheme();
  const inviteCode = useMemo(() => generateInviteCode(), []);
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = () => {
    if (joinCode.trim().length === 0) return;
    Alert.alert(
      'Демо-режим',
      'Подключение к семейному бюджету по коду появится вместе с облачной синхронизацией.'
    );
  };

  return (
    <ScreenContainer>
      <Card style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>Пригласите партнёра</Text>
        <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: spacing.md }}>
          Покажите этот QR-код или продиктуйте код приглашения
        </Text>
        <View style={styles.qrWrap}>
          <QRCode value={`finance-app://family-invite/${inviteCode}`} size={180} color={theme.primary} />
        </View>
        <Text style={[styles.code, { color: theme.text }]}>{inviteCode}</Text>
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Присоединиться</Text>
        <FormInput label="Код приглашения" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" />
        <AppButton title="Присоединиться к бюджету" onPress={handleJoin} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  qrWrap: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 12 },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 4, marginTop: spacing.md },
});
