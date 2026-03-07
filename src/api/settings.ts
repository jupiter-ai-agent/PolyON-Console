import { apiFetch } from './client';

// ── Domain ────────────────────────────────────────────────────────────────────
export interface DomainInfo {
  domain?: string;
  netbios?: string;
  forest?: string;
  dn?: string;
  hostname?: string;
  fsmo?: string;
  level?: string;
  realm?: string;
}

export interface DomainConfig {
  dc_domain?: string;
  mail_domain?: string;
  console_domain?: string;
  portal_domain?: string;
  base_domain?: string;
}

export interface ServiceDomainSettings {
  base_domain?: string;
  console_domain?: string;
  portal_domain?: string;
}

export interface DomainLevelData {
  domain_level?: string;
  forest_level?: string;
}

export const settingsApi = {
  // ── General / Domain ─────────────────────────────────────────────────────────
  getDomainInfo: () => apiFetch<{ data?: DomainInfo } & DomainInfo>('/domain/info'),
  getDomainConfig: () => apiFetch<DomainConfig>('/settings/domain'),
  putDomainConfig: (body: Partial<DomainConfig>) =>
    apiFetch<{ success: boolean; error?: string }>('/settings/domain', {
      method: 'PUT', body: JSON.stringify(body),
    }),
  getDomainLevel: () => apiFetch<DomainLevelData>('/dns/domain/level'),
  raiseDomainLevel: (domain_level: string, forest_level: string) =>
    apiFetch<{ success: boolean; error?: string; output?: string }>('/dns/domain/level', {
      method: 'POST', body: JSON.stringify({ domain_level, forest_level }),
    }),

  // ── System Health / Info ─────────────────────────────────────────────────────
  getSystemHealth: () => apiFetch<{ hostname?: string }>('/system/health'),
  getSystemVersion: () => apiFetch<{ core_version: string; console_version?: string }>('/system/version'),
  getSystemComponents: () =>
    apiFetch<{
      components: Array<{ id: string; name: string; description: string; version?: string; icon?: string; accent?: string; status?: string; category?: string }>;
      categories: string[];
      grouped: Record<string, unknown[]>;
    }>('/system/components'),
  getEnginesStatus: () =>
    apiFetch<{ engines: Record<string, { status: string; version?: string }> }>('/engines/status'),

  // ── Backup ───────────────────────────────────────────────────────────────────
  listBackups: () => apiFetch<{ backups: string[] }>('/system/backups'),
  createBackup: () => apiFetch<{ success: boolean; error?: string; stderr?: string }>('/system/backup', { method: 'POST' }),

  // ── Account ──────────────────────────────────────────────────────────────────
  getProfile: () =>
    apiFetch<{ success: boolean; profile?: { username: string; firstName?: string; lastName?: string; email?: string }; error?: string }>('/account/profile'),
  putProfile: (body: { email?: string; first_name?: string; last_name?: string }) =>
    apiFetch<{ success: boolean; error?: string }>('/account/profile', { method: 'PUT', body: JSON.stringify(body) }),
  putPassword: (body: { current_password: string; new_password: string }) =>
    apiFetch<{ success: boolean; error?: string }>('/account/password', { method: 'PUT', body: JSON.stringify(body) }),

  // ── Credentials ──────────────────────────────────────────────────────────────
  listCredentials: () =>
    apiFetch<{ success: boolean; services: Array<{ id: string; name: string; port?: number; has_password: boolean; username?: string; password_masked?: string; editable?: boolean; note?: string }> }>('/credentials/services'),
  revealCredential: (id: string) =>
    apiFetch<{ success: boolean; password: string }>(`/credentials/services/${id}/password`),
  putCredentialPassword: (id: string, new_password: string) =>
    apiFetch<{ success: boolean; error?: string; message?: string; restart_needed?: string[] }>(`/credentials/services/${id}/password`, {
      method: 'PUT', body: JSON.stringify({ new_password }),
    }),

  // ── SMTP ─────────────────────────────────────────────────────────────────────
  getSmtpConfig: () =>
    apiFetch<{ data?: SmtpConfig } & SmtpConfig>('/smtp/config'),
  putSmtpConfig: (body: SmtpConfig) =>
    apiFetch<{ success: boolean; error?: string }>('/smtp/config', { method: 'PUT', body: JSON.stringify(body) }),
  testSmtpConnection: () =>
    apiFetch<{ message?: string }>('/smtp/connection-test', { method: 'POST' }),
  testSmtpMail: (to: string) =>
    apiFetch<{ message?: string }>('/smtp/test', { method: 'POST', body: JSON.stringify({ to }) }),

  // ── Domain Management ────────────────────────────────────────────────────────
  getDomainSettings: () =>
    apiFetch<ServiceDomainSettings>('/settings/domain-settings').catch(() => apiFetch<ServiceDomainSettings>('/settings/domain')),
  putDomainSettings: (body: ServiceDomainSettings) =>
    apiFetch<{ success: boolean; error?: string; steps?: Array<{ name: string; status: string; message?: string }> }>('/settings/domain-settings', {
      method: 'PUT', body: JSON.stringify(body),
    }),
  listApps: () =>
    apiFetch<{ apps?: AppEntry[] } | AppEntry[]>('/apps'),
  putAppDomain: (id: string, body: { subdomain: string }) =>
    apiFetch<{ success: boolean; error?: string; id?: string }>(`/apps/${id}/domain`, {
      method: 'PUT', body: JSON.stringify(body),
    }),
  deleteAppDomain: (id: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/apps/${id}/domain`, { method: 'DELETE' }),

  // ── Config History ───────────────────────────────────────────────────────────
  getConfigHistory: async (limit = 50) => {
    const res = await fetch(`/api/v1/config/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch config history');
    return res.json();
  },
  getConfigDiff: async (sha: string) => {
    const res = await fetch(`/api/v1/config/history/${sha}/diff`);
    if (!res.ok) throw new Error('Failed to fetch diff');
    return res.json();
  },
  trackConfig: async () => {
    const res = await fetch('/api/v1/config/track', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to track config');
    return res.json();
  },

  // ── Reset ────────────────────────────────────────────────────────────────────
  getSentinelState: () => apiFetch<SentinelState>('/../../api/sentinel/state'),
  executeReset: () =>
    fetch('/api/sentinel/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'RESET' }) }),
  pollResetProgress: () =>
    fetch('/api/sentinel/progress').then(r => r.json()).catch(() => ({})),
};

export interface SmtpConfig {
  host?: string;
  port?: number;
  security?: 'starttls' | 'ssl' | 'none';
  username?: string;
  password?: string;
  from_address?: string;
  from_name?: string;
  alert_to?: string;
  enabled?: boolean;
}

export interface AppEntry {
  id: string;
  name: string;
  subdomain?: string;
  backend_url?: string;
  backendUrl?: string;
}

export interface SentinelState {
  state?: string;
  provisioned?: boolean;
  _reset_status?: Record<string, Record<string, unknown>>;
}
