import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { buildTheme, type Theme } from './index';
import { useSettingsStore } from '../store/settingsStore';

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = useMemo(() => buildTheme(colorScheme, isDarkMode), [colorScheme, isDarkMode]);

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.4);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [colorScheme, isDarkMode, fade]);

  return (
    <ThemeContext.Provider value={theme}>
      <Animated.View style={{ flex: 1, opacity: fade }}>{children}</Animated.View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
