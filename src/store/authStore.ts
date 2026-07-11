import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { AuthMethod } from '../types';

const SECRET_KEY = 'finance_app_auth_secret';
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000;

// Сам PIN/пароль хранится ТОЛЬКО в expo-secure-store (шифрованное хранилище ОС).
// В persist-хранилище (AsyncStorage, см. partialize ниже) остаются лишь метаданные —
// факт настройки входа, метод и счётчик попыток, — секрет туда никогда не попадает.

interface AuthState {
  hasSetupAuth: boolean;
  authMethod: AuthMethod;
  failedAttempts: number;
  lockedUntil: number | null;
  isUnlockedThisSession: boolean;
  setupAuth: (method: AuthMethod, secret: string) => Promise<void>;
  verifySecret: (input: string) => Promise<boolean>;
  unlockWithBiometric: () => void;
  lock: () => void;
  changeSecret: (method: AuthMethod, secret: string) => Promise<void>;
  resetAuth: () => Promise<void>;
  isLockedOut: () => boolean;
  lockoutRemainingMs: () => number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hasSetupAuth: false,
      authMethod: 'pin',
      failedAttempts: 0,
      lockedUntil: null,
      isUnlockedThisSession: false,

      setupAuth: async (method, secret) => {
        await SecureStore.setItemAsync(SECRET_KEY, secret);
        set({ hasSetupAuth: true, authMethod: method, failedAttempts: 0, lockedUntil: null });
      },

      changeSecret: async (method, secret) => {
        await SecureStore.setItemAsync(SECRET_KEY, secret);
        set({ authMethod: method });
      },

      verifySecret: async (input) => {
        if (get().isLockedOut()) return false;
        const stored = await SecureStore.getItemAsync(SECRET_KEY);
        const isValid = stored !== null && stored === input;
        if (isValid) {
          set({ failedAttempts: 0, lockedUntil: null, isUnlockedThisSession: true });
          return true;
        }
        // После 3 неверных попыток включаем блокировку на 5 минут; счётчик и время
        // окончания блокировки переживают перезапуск приложения (persist), иначе
        // блокировку можно было бы обойти простым перезапуском.
        const attempts = get().failedAttempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          set({ failedAttempts: attempts, lockedUntil: Date.now() + LOCKOUT_MS });
        } else {
          set({ failedAttempts: attempts });
        }
        return false;
      },

      unlockWithBiometric: () => set({ isUnlockedThisSession: true, failedAttempts: 0, lockedUntil: null }),

      lock: () => set({ isUnlockedThisSession: false }),

      resetAuth: async () => {
        await SecureStore.deleteItemAsync(SECRET_KEY);
        set({ hasSetupAuth: false, failedAttempts: 0, lockedUntil: null, isUnlockedThisSession: false });
      },

      isLockedOut: () => {
        const until = get().lockedUntil;
        return until !== null && until > Date.now();
      },

      lockoutRemainingMs: () => {
        const until = get().lockedUntil;
        if (until === null) return 0;
        return Math.max(until - Date.now(), 0);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSetupAuth: state.hasSetupAuth,
        authMethod: state.authMethod,
        failedAttempts: state.failedAttempts,
        lockedUntil: state.lockedUntil,
      }),
    }
  )
);
