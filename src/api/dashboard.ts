/**
 * Dashboard API functions
 * 기존 dashboard.js의 API 호출을 React/TypeScript로 재구현
 */
import { apiFetch } from './client';

// ── 타입 정의 ──────────────────────────────────────────────────────────────

export interface UserListResponse {
  count: number;
  users: Array<{ username: string; enabled: boolean; mail?: string }>;
}

export interface GroupListResponse {
  count: number;
}

export interface OUListResponse {
  count: number;
}

export interface ComputersResponse {
  computers: Array<{ name: string }>;
}

export interface DomainInfoResponse {
  realm?: string;
  base_dn?: string;
  level_info?: string;
}

export interface SystemResourcesResponse {
  cpu_percent?: number;
  memory_used_mb?: number;
  memory_total_mb?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  uptime?: string;
  container_count?: number;
  load_avg?: string;
}

export interface MailStatusResponse {
  provisioned?: boolean;
  domain?: string;
  version?: string;
}

export interface MailServiceCheckResponse {
  services?: {
    smtp?: boolean;
    submission?: boolean;
    imap?: boolean;
    caldav?: boolean;
    jmap?: boolean;
    carddav?: boolean;
    sieve?: boolean;
  };
}

export interface DatabaseStatusResponse {
  postgresql?: {
    status?: string;
    version?: string;
    size?: string;
    connections?: number;
    databases?: string[];
  };
  redis?: {
    status?: string;
    version?: string;
    total_keys?: number;
  };
  elasticsearch?: {
    status?: string;
    version?: string;
    docs_count?: number;
    indices_count?: number;
  };
  stalwart?: {
    version?: string;
  };
}

export interface RustFSStatsResponse {
  total_buckets?: number;
  total_size_bytes?: number;
}

export interface ContainerInfo {
  name: string;
  state: string;
  status: string;
}

export interface ContainersResponse {
  success: boolean;
  containers?: ContainerInfo[];
}

export interface AlertSummaryResponse {
  total?: number;
}

export interface Alert {
  timestamp?: string;
  level?: string;
  message?: string;
}

export interface AlertsResponse {
  alerts?: Alert[];
}

export interface SentinelStatusResponse {
  state?: string;
}

export interface StalwartPrincipalsResponse {
  data?: { total?: number };
}

export interface StalwartQueueResponse {
  data?: { total?: number };
}

export interface PrometheusRangeResponse {
  data?: {
    result?: Array<{
      values?: Array<[number, string]>;
    }>;
  };
}

// ── API 함수 ──────────────────────────────────────────────────────────────

export const dashboardApi = {
  listUsers: () => apiFetch<UserListResponse>('/users'),
  listGroups: () => apiFetch<GroupListResponse>('/groups'),
  listOUs: () => apiFetch<OUListResponse>('/ous'),
  domainComputers: () => apiFetch<ComputersResponse>('/domain/computers'),
  domainInfo: () => apiFetch<DomainInfoResponse>('/domain/info'),

  systemResources: () => apiFetch<SystemResourcesResponse>('/system/resources'),
  mailStatus: () => apiFetch<MailStatusResponse>('/mail/status'),
  mailServiceCheck: () => apiFetch<MailServiceCheckResponse>('/mail/service-check'),

  databaseStatus: () => apiFetch<DatabaseStatusResponse>('/databases/status'),
  rustFSStats: () => apiFetch<RustFSStatsResponse>('/databases/rustfs/stats'),
  containers: () => apiFetch<ContainersResponse>('/containers/'),
  alertSummary: () =>
    fetch('/api/alerts/summary').then(r => r.json() as Promise<AlertSummaryResponse>).catch(() => ({} as AlertSummaryResponse)),
  alerts: (limit = 5) =>
    fetch(`/api/alerts?limit=${limit}`).then(r => r.json() as Promise<AlertsResponse>).catch(() => ({ alerts: [] } as AlertsResponse)),
  sentinelStatus: () => apiFetch<SentinelStatusResponse>('/sentinel/status'),

  // Stalwart (외부 API — base URL이 다름)
  stalwartPrincipals: (params: { types: string; limit: number }) => {
    const qs = new URLSearchParams({ types: params.types, limit: String(params.limit) });
    return fetch(`/api/v1/mail/principals?${qs}`)
      .then(r => r.json() as Promise<StalwartPrincipalsResponse>)
      .catch(() => ({ data: { total: 0 } } as StalwartPrincipalsResponse));
  },
  stalwartQueue: (params: { limit: number }) => {
    return fetch(`/api/v1/mail/queue?limit=${params.limit}`)
      .then(r => r.json() as Promise<StalwartQueueResponse>)
      .catch(() => ({ data: { total: 0 } } as StalwartQueueResponse));
  },

  // Prometheus 시계열
  prometheusQueryRange: async (query: string, start: number, end: number, step: number) => {
    const qs = new URLSearchParams({
      query,
      start: String(start),
      end: String(end),
      step: String(step),
    });
    try {
      const res = await fetch(`/api/v1/system/prometheus/query_range?${qs}`);
      if (!res.ok) return [] as Array<{ t: number; v: number }>;
      const json = (await res.json()) as PrometheusRangeResponse;
      const values = json?.data?.result?.[0]?.values || [];
      return values
        .map(([t, v]) => ({ t: Number(t), v: parseFloat(v) }))
        .filter(p => isFinite(p.v));
    } catch {
      return [] as Array<{ t: number; v: number }>;
    }
  },
};
