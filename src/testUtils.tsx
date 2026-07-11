import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from './theme';

// Большинство компонентов читают цвета через useTheme(), которому нужен ThemeProvider —
// эта обёртка избавляет каждый тест от повторения одного и того же контекста.
export function renderWithTheme(ui: React.ReactElement, options?: RenderOptions) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}
