import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE_KEY = 'finance_app_ai_api_key';

// API-ключ хранится ТОЛЬКО в expo-secure-store (шифрованное хранилище ОС), как и PIN/пароль
// в authStore — в состоянии стора держим лишь факт наличия ключа (hasApiKey), а не сам ключ,
// чтобы он не задерживался в памяти/рендерах дольше, чем нужно для одного запроса к API.
interface AiState {
  hasApiKey: boolean;
  isLoaded: boolean;
  loadApiKeyStatus: () => Promise<void>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

export const useAiStore = create<AiState>((set) => ({
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
    set({ hasApiKey: false });
  },
}));
