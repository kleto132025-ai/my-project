const secureStoreData: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => secureStoreData[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    secureStoreData[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete secureStoreData[key];
  }),
}));

import { useAiStore } from '../store/aiStore';
import * as SecureStore from 'expo-secure-store';

const initialState = useAiStore.getState();

beforeEach(() => {
  useAiStore.setState(initialState, true);
  jest.clearAllMocks();
  for (const key of Object.keys(secureStoreData)) delete secureStoreData[key];
});

describe('aiStore API key handling', () => {
  it('loadApiKeyStatus reports hasApiKey false when nothing is stored', async () => {
    await useAiStore.getState().loadApiKeyStatus();
    expect(useAiStore.getState().hasApiKey).toBe(false);
    expect(useAiStore.getState().isLoaded).toBe(true);
  });

  it('setApiKey trims and stores the key only in secure storage, never in state', async () => {
    await useAiStore.getState().setApiKey('  sk-test-123  ');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('finance_app_ai_api_key', 'sk-test-123');
    expect(useAiStore.getState().hasApiKey).toBe(true);
    expect(useAiStore.getState()).not.toHaveProperty('apiKey');
  });

  it('getApiKey reads the raw key back from secure storage on demand', async () => {
    await useAiStore.getState().setApiKey('sk-abc');
    const key = await useAiStore.getState().getApiKey();
    expect(key).toBe('sk-abc');
  });

  it('clearApiKey removes the key and wipes the cached insight', async () => {
    await useAiStore.getState().setApiKey('sk-abc');
    useAiStore.getState().setLastInsight('prompt-1', 'insight-1');

    await useAiStore.getState().clearApiKey();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('finance_app_ai_api_key');
    const state = useAiStore.getState();
    expect(state.hasApiKey).toBe(false);
    expect(state.lastPrompt).toBeNull();
    expect(state.lastInsight).toBeNull();
    expect(state.lastInsightAt).toBeNull();
  });
});

describe('aiStore insight cache', () => {
  it('setLastInsight stores the prompt/insight pair with a timestamp', () => {
    const before = Date.now();
    useAiStore.getState().setLastInsight('my prompt', 'my insight');
    const state = useAiStore.getState();
    expect(state.lastPrompt).toBe('my prompt');
    expect(state.lastInsight).toBe('my insight');
    expect(state.lastInsightAt).toBeGreaterThanOrEqual(before);
  });

  it('a differing prompt is distinguishable from the cached one (cache-diff re-fetch trigger)', () => {
    useAiStore.getState().setLastInsight('prompt-A', 'insight-A');
    const { lastPrompt } = useAiStore.getState();
    expect(lastPrompt).not.toBe('prompt-B');
    expect(lastPrompt).toBe('prompt-A');
  });
});
