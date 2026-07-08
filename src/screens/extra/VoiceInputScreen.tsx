import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';

export function VoiceInputScreen() {
  const theme = useTheme();
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => setIsListening((v) => !v);

  return (
    <ScreenContainer>
      <Card>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          Голосовой ввод транзакций — заглушка. В финальной сборке (с custom dev client) здесь будет
          распознавание речи через expo-speech-recognition или системный диктофон устройства.
        </Text>
        <View style={styles.center}>
          <Pressable
            onPress={toggleListening}
            style={[styles.micButton, { backgroundColor: isListening ? theme.accent : theme.primary }]}
          >
            <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={36} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: theme.textMuted, marginTop: spacing.md }}>
            {isListening ? 'Слушаю... скажите, например: «Продукты 500 рублей»' : 'Нажмите, чтобы начать'}
          </Text>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  micButton: { width: 80, height: 80, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
