// Auth store — Zustand-based, persists token + user info across sessions
import type { AuthFlow, FlowConfig, User, UserRole } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { api } from './api';

const DEFAULT_FLOW_CONFIG: FlowConfig = {
  biometric: true,
  fileUpload: true,
  cameraInjection: true,
};

interface AuthState {
  role: UserRole;
  flow: AuthFlow;
  token: string | null;
  user: User | null;
  email: string;
  flowConfig: FlowConfig;
  biometricEnabled: boolean;
  setRole: (role: UserRole) => void;
  setFlow: (flow: AuthFlow) => void;
  setEmail: (email: string) => void;
  setFlowConfig: (cfg: Partial<FlowConfig>) => void;
  resetFlowConfig: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  loadBiometricEnabled: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  loadToken: () => Promise<string | null>;
  clearToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  role: 'user',
  flow: 'login',
  token: null,
  user: null,
  email: '',
  flowConfig: { ...DEFAULT_FLOW_CONFIG },
  biometricEnabled: true,

  setRole: (role) => set({ role }),
  setFlow: (flow) => set({ flow }),
  setEmail: (email) => set({ email }),

  setFlowConfig: (cfg) =>
    set((state) => ({ flowConfig: { ...state.flowConfig, ...cfg } })),

  resetFlowConfig: () => set({ flowConfig: { ...DEFAULT_FLOW_CONFIG } }),

  setBiometricEnabled: async (enabled) => {
    set({ biometricEnabled: enabled });
    await AsyncStorage.setItem('biometric_enabled', enabled ? 'true' : 'false');
  },

  loadBiometricEnabled: async () => {
    const stored = await AsyncStorage.getItem('biometric_enabled');
    // Default is true — only false when explicitly set to 'false'
    set({ biometricEnabled: stored !== 'false' });
  },

  setToken: async (token) => {
    set({ token });
    api.setMemToken(token);
    await AsyncStorage.setItem('auth_token', token);
  },

  loadToken: async () => {
    const stored = await AsyncStorage.getItem('auth_token');
    if (stored) {
      set({ token: stored });
      api.setMemToken(stored);
    }
    return stored;
  },

  clearToken: async () => {
    set({ token: null });
    await AsyncStorage.removeItem('auth_token');
  },

  setUser: (user) =>
    set({ user, role: user ? (user.role as UserRole) : 'user' }),

  clearUser: () => set({ user: null }),

  logout: async () => {
    set({ token: null, user: null, role: 'user', flowConfig: { ...DEFAULT_FLOW_CONFIG } });
    await api.clearToken();
    await AsyncStorage.removeItem('auth_token');
  },
}));

// ── Backward-compat shim ──────────────────────────────────────────────────────
// All existing code that imports AuthStore continues to work unchanged.
export const AuthStore = {
  getRole: () => useAuthStore.getState().role,
  setRole: (role: UserRole) => useAuthStore.getState().setRole(role),
  getFlow: () => useAuthStore.getState().flow,
  setFlow: (flow: AuthFlow) => useAuthStore.getState().setFlow(flow),
  getEmail: () => useAuthStore.getState().email,
  setEmail: (email: string) => useAuthStore.getState().setEmail(email),
  getFlowConfig: () => useAuthStore.getState().flowConfig,
  setFlowConfig: (cfg: Partial<FlowConfig>) => useAuthStore.getState().setFlowConfig(cfg),
  resetFlowConfig: () => useAuthStore.getState().resetFlowConfig(),
  setToken: (token: string) => useAuthStore.getState().setToken(token),
  getToken: () => useAuthStore.getState().token,
  loadToken: () => useAuthStore.getState().loadToken(),
  clearToken: () => useAuthStore.getState().clearToken(),
  setUser: (user: User | null) => useAuthStore.getState().setUser(user),
  getUser: () => useAuthStore.getState().user,
  clearUser: () => useAuthStore.getState().clearUser(),
  logout: () => useAuthStore.getState().logout(),
  getBiometricEnabled: () => useAuthStore.getState().biometricEnabled,
  setBiometricEnabled: (enabled: boolean) => useAuthStore.getState().setBiometricEnabled(enabled),
  loadBiometricEnabled: () => useAuthStore.getState().loadBiometricEnabled(),
};