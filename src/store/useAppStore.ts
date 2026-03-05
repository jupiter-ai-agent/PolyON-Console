import { create } from 'zustand';

interface DomainInfo {
  realm: string;
  realmLower: string;
  base_dn: string;
  domain: string;
}

interface AppState {
  // Domain info
  domainInfo: DomainInfo;
  setDomainInfo: (info: DomainInfo) => void;

  // Auth
  username: string;
  setUsername: (u: string) => void;

  // Navigation
  currentModule: string;
  setCurrentModule: (m: string) => void;

  navExpanded: boolean;
  toggleNav: () => void;

  // Global toast
  toast: { message: string; type: 'info' | 'success' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  domainInfo: {
    realm: '',
    realmLower: '',
    base_dn: '',
    domain: '',
  },
  setDomainInfo: (info) => set({ domainInfo: info }),

  username: '',
  setUsername: (u) => set({ username: u }),

  currentModule: 'home',
  setCurrentModule: (m) => set({ currentModule: m }),

  navExpanded: localStorage.getItem('he-nav-expanded') !== 'false',
  toggleNav: () =>
    set((state) => {
      const next = !state.navExpanded;
      localStorage.setItem('he-nav-expanded', String(next));
      return { navExpanded: next };
    }),

  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
