import React from 'react';
import { ScrollView, View, StyleSheet, KeyboardAvoidingView, Platform, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { spacing } from '../theme';

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
}

export function ScreenContainer({ scroll = true, style, children, ...rest }: ScreenContainerProps) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['bottom', 'left', 'right']}>
      {/* Без этого клавиатура на длинных формах (много полей подряд) просто перекрывала
          нижние поля и кнопки "Сохранить" — на iOS/Android это стандартный способ подвинуть
          контент вверх, когда открывается клавиатура. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Container
          style={scroll ? undefined : [styles.flex, style]}
          contentContainerStyle={scroll ? [styles.content, style] : undefined}
          keyboardShouldPersistTaps={scroll ? 'handled' : undefined}
          {...rest}
        >
          {children}
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, padding: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
