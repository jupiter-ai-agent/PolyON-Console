import { apiFetch } from './client';

export interface ProviderInfo {
  type: string;
  service: string;
  status: string;
  claimCount: number;
  boundCount: number;
}

export interface ClaimInfo {
  id: string;
  moduleId: string;
  moduleName: string;
  claimType: string;
  config: Record<string, unknown>;
  status: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDetail {
  type: string;
  status: string;
  resources: ClaimInfo[];
}

export interface SagaLogEntry {
  id: string;
  moduleId: string;
  action: string;
  claimType: string;
  status: string;
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export const prcApi = {
  listProviders: () =>
    apiFetch<ProviderInfo[]>('/prc/providers'),

  getProvider: (type: string) =>
    apiFetch<ProviderDetail>(`/prc/providers/${type}`),

  listClaims: (params?: { status?: string; type?: string; moduleId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    if (params?.moduleId) q.set('moduleId', params.moduleId);
    const qs = q.toString();
    return apiFetch<{ items: ClaimInfo[]; total: number }>(`/prc/claims${qs ? '?' + qs : ''}`);
  },

  listSagaLog: (params?: { moduleId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.moduleId) q.set('moduleId', params.moduleId);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch<{ items: SagaLogEntry[]; total: number }>(`/prc/saga-log${qs ? '?' + qs : ''}`);
  },
};
