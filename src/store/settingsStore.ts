import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Currency, ThemeScheme } from '../types';

export type ProfileKind = 'personal' | 'business' | 'family';

interface SettingsState {
  currency: Currency;
  exchangeRates: Record<Currency, number>;
  colorScheme: ThemeScheme;
  isDarkMode: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  activeProfile: ProfileKind;
  hasCompletedOnboarding: boolean;
  recoveryEmail: string;
  setRecoveryEmail: (email: string) => void;
  setCurrency: (currency: Currency) => void;
  setExchangeRate: (currency: Currency, rate: number) => void;
  setColorScheme: (scheme: ThemeScheme) => void;
  toggleDarkMode: () => void;
  setSoundEnabled: (v: boolean) => void;
  setVibrationEnabled: (v: boolean) => void;
  setActiveProfile: (profile: ProfileKind) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'RUB',
      exchangeRates: { RUB: 1, USD: 90, EUR: 98 },
      colorScheme: 'blue',
      isDarkMode: false,
      soundEnabled: true,
      vibrationEnabled: true,
      activeProfile: 'personal',
      hasCompletedOnboarding: false,
      recoveryEmail: '',
      setRecoveryEmail: (recoveryEmail) => set({ recoveryEmail }),
      setCurrency: (currency) => set({ currency }),
      setExchangeRate: (currency, rate) =>
        set((state) => ({ exchangeRates: { ...state.exchangeRates, [currency]: rate } })),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      setActiveProfile: (activeProfile) => set({ activeProfile }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
