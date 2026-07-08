import { SCHEMES, NEUTRAL_LIGHT, NEUTRAL_DARK, type SchemeColors } from './colors';
import type { ThemeScheme } from '../types';

export interface Theme extends SchemeColors {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  isDark: boolean;
  expenseColor: string;
  incomeColor: string;
}

export function buildTheme(scheme: ThemeScheme, isDark: boolean): Theme {
  const schemeColors = SCHEMES[scheme];
  const neutrals = isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  return {
    ...schemeColors,
    ...neutrals,
    isDark,
    expenseColor: '#7F1D1D',
    incomeColor: '#2563EB',
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export { SCHEMES };
export * from './ThemeContext';
