import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateGlobal } from '../navigation/navigationRef';

// Экраны бокового меню (Накопления, Кредиты, Доходы/Расходы, Уведомления и т.д.) — каждый
// корень своего отдельного стека, поэтому у них нет системной кнопки "назад": единственный
// способ вернуться на Главную — открыть боковое меню и найти там нужный пункт, что не всегда
// очевидно. Эта кнопка в шапке даёт прямой путь на Главную одним нажатием, независимо от того,
// с какого экрана меню на неё смотрят.
export function HomeButton() {
  return (
    <Pressable onPress={() => navigateGlobal('Tabs')} hitSlop={12} style={styles.wrapper}>
      <Ionicons name="home-outline" size={22} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginRight: 16 },
});
