import { apiFetch } from './client';

const AI = '/ai';

export interface ModelInfo {
  model_name: string;
  litellm_params: {
    model: string;
    [key: string]: unknown;
  };
  model_info?: {
    id?: string;
    [key: string]: unknown;
  };
}

export interface ModelsInfoResponse {
  data: ModelInfo[];
}

export interface Agent {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  memory_mb?: number;
}

export interface AgentsResponse {
  agents: Agent[];
  count: number;
}

export interface MemoryStats {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  count: number;
}

export interface AIKey {
  token?: string;
  key?: string;
  key_alias?: string;
  key_name?: string;
  max_budget?: number;
  spend?: number;
  models?: string[];
  expires?: string;
}

export interface KeysResponse {
  keys: AIKey[];
}

export interface UsageGlobal {
  spend?: number;
  total_spend?: number;
}

export interface UsageLog {
  startTime?: string;
  model?: string;
  api_key?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  spend?: number;
}

export interface AISettings {
  health?: { status: string };
  modelCount?: number;
  keyCount?: number;
}

export const aiApi = {
  getModelsInfo: () => apiFetch<ModelsInfoResponse>(`${AI}/models/info`),
  getAgents: () => apiFetch<AgentsResponse>(`${AI}/agents`),
  getMemoryStats: () => apiFetch<MemoryStats>(`${AI}/memory/stats`),
  getSettings: () => apiFetch<AISettings>(`${AI}/settings`),
  getUsageGlobal: () => apiFetch<UsageGlobal>(`${AI}/usage/global`),
  getUsageLogs: () => apiFetch<UsageLog[] | { logs: UsageLog[] }>(`${AI}/usage/logs`),
  getKeys: () => apiFetch<KeysResponse>(`${AI}/keys`),

  addModelToGroup: (service_name: string, actual_model: string) =>
    apiFetch(`${AI}/models/group/add`, {
      method: 'POST',
      body: JSON.stringify({ service_name, actual_model }),
    }),

  removeModelFromGroup: (model_id: string) =>
    apiFetch(`${AI}/models/group/remove`, {
      method: 'POST',
      body: JSON.stringify({ model_id }),
    }),

  deleteService: (name: string) =>
    apiFetch(`${AI}/models/service/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  registerModel: (model_name: string, actual_model: string) =>
    apiFetch(`${AI}/models`, {
      method: 'POST',
      body: JSON.stringify({ model_name, litellm_params: { model: actual_model } }),
    }),

  deleteModel: (modelId: string) =>
    apiFetch(`${AI}/models/${encodeURIComponent(modelId)}`, { method: 'DELETE' }),

  createKey: (payload: {
    key_alias: string;
    max_budget?: number;
    models?: string[];
    duration?: string;
  }) =>
    apiFetch<{ key?: string; token?: string }>(`${AI}/keys`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteKey: (keyId: string) =>
    apiFetch(`${AI}/keys/${encodeURIComponent(keyId)}`, { method: 'DELETE' }),
};
