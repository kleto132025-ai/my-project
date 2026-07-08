import type { ThemeScheme } from '../types';

export interface SchemeColors {
  primary: string;
  primaryDark: string;
  accent: string;
  secondary: string;
}

export const SCHEMES: Record<ThemeScheme, SchemeColors> = {
  blue: {
    primary: '#1E3A5F',
    primaryDark: '#152A45',
    accent: '#7F1D1D',
    secondary: '#2563EB',
  },
  maroon: {
    primary: '#7F1D1D',
    primaryDark: '#5C1414',
    accent: '#1E3A5F',
    secondary: '#B91C1C',
  },
  green: {
    primary: '#14532D',
    primaryDark: '#0F3D22',
    accent: '#166534',
    secondary: '#22C55E',
  },
  purple: {
    primary: '#4C1D95',
    primaryDark: '#38156E',
    accent: '#6D28D9',
    secondary: '#8B5CF6',
  },
};

export const NEUTRAL_LIGHT = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
};

export const NEUTRAL_DARK = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#334155',
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#F87171',
};
