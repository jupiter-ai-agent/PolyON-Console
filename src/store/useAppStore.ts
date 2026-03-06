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

  // 설치된 서비스 목록 - K8s Pod 기반 동적 메뉴를 위해
  installedServices: string[];
  setInstalledServices: (services: string[]) => void;

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

  // 현재 K8s에 설치된 base 서비스 목록 (향후 /api/v1/platform/services API 연동)
  installedServices: [
    'home',
    'apps', 
    'directory',
    'tree-view',
    'mail',
    'networking',
    'database',
    'monitoring',
    'security',
    'settings'
  ],
  setInstalledServices: (services) => set({ installedServices: services }),

  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
