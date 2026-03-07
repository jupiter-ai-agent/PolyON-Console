import { apiFetch } from './client';

export interface ModuleNavItem {
  label: string;
  path?: string;
  icon?: string;
  type?: 'divider' | 'header' | 'group';
  children?: ModuleNavItem[];
}

export interface ModuleNavInfo {
  id: string;
  title: string;
  section: string;
  icon: string;
  defaultPath: string;
  sortOrder: number;
  items: ModuleNavItem[];
  routes: { path: string; component: string }[];
}

export const modulesApi = {
  getNav: () =>
    apiFetch<{ modules: ModuleNavInfo[] }>('/modules/nav'),

  getCatalog: (category?: string) =>
    apiFetch<{ modules: any[] }>(`/modules/catalog${category ? `?category=${category}` : ''}`),

  register: (image: string) =>
    apiFetch<any>('/modules/register', {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  install: (id: string) =>
    apiFetch<any>(`/modules/${id}/install`, { method: 'POST' }),

  uninstall: (id: string, dataPolicy = 'ask') =>
    apiFetch<any>(`/modules/${id}/uninstall`, {
      method: 'POST',
      body: JSON.stringify({ dataPolicy }),
    }),

  installStatus: (id: string, eventId: number) =>
    apiFetch<any>(`/modules/${id}/install/status?eventId=${eventId}`),
};