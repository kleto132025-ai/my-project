import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE_KEY = 'finance_app_ai_api_key';

// API-ключ хранится ТОЛЬКО в expo-secure-store (шифрованное хранилище ОС), как и PIN/пароль
// в authStore — в состоянии стора держим лишь факт наличия ключа (hasApiKey), а не сам ключ,
// чтобы он не задерживался в памяти/рендерах дольше, чем нужно для одного запроса к API.
//
// lastPrompt/lastInsight/lastInsightAt — кэш последнего автоматического ИИ-анализа, в обычном
// AsyncStorage (ничего секретного). Экран сравнивает свежепостроенный промпт с lastPrompt: если
// внесённые данные не изменились с прошлого раза — просто показывает кэш без нового запроса к
// API; если изменились — запрос идёт автоматически, без нажатия кнопки пользователем.
interface AiState {
  hasApiKey: boolean;
  isLoaded: boolean;
  loadApiKeyStatus: () => Promise<void>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;

  lastPrompt: string | null;
  lastInsight: string | null;
  lastInsightAt: number | null;
  setLastInsight: (prompt: string, insight: string) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      hasApiKey: false,
      isLoaded: false,

      loadApiKeyStatus: async () => {
        const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
        set({ hasApiKey: !!key, isLoaded: true });
      },

      getApiKey: async () => SecureStore.getItemAsync(API_KEY_STORAGE_KEY),

      setApiKey: async (key: string) => {
        await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key.trim());
        set({ hasApiKey: true });
      },

      clearApiKey: async () => {
        await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
        set({ hasApiKey: false, lastPrompt: null, lastInsight: null, lastInsightAt: null });
      },

      lastPrompt: null,
      lastInsight: null,
      lastInsightAt: null,
      setLastInsight: (prompt, insight) => set({ lastPrompt: prompt, lastInsight: insight, lastInsightAt: Date.now() }),
    }),
    {
      name: 'ai-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastPrompt: state.lastPrompt,
        lastInsight: state.lastInsight,
        lastInsightAt: state.lastInsightAt,
      }),
    }
  )
);
