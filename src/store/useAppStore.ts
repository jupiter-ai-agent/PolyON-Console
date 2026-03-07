import { create } from 'zustand';
import type { ModuleNavInfo } from '../api/modules';

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

  // Module navigation
  moduleNav: ModuleNavInfo[];
  setModuleNav: (nav: ModuleNavInfo[]) => void;
  refreshModuleNav: () => void;
  moduleNavLoaded: boolean;

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

  moduleNav: [],
  moduleNavLoaded: false,
  setModuleNav: (nav) => set({ moduleNav: nav, moduleNavLoaded: true }),
  refreshModuleNav: () => set({ moduleNavLoaded: false }),

  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
