/**
 * Stalwart Mail Server REST API Client
 * /mail-proxy → polyon-mail:8080/api/ 프록시
 * 기존 stalwart-api.js를 TypeScript로 재구현
 */

const MAIL_BASE = '/mail-proxy';

// ── 타입 정의 ──────────────────────────────────────────────────────────────

export interface StalwartResponse<T = unknown> {
  data?: T;
}

export interface PrincipalListData {
  total?: number;
  items?: Principal[] | number[];
}

export interface Principal {
  name?: string;
  type?: string;
  description?: string;
  emails?: string[];
  secrets?: string[];
  memberOf?: string[];
  roles?: string[];
  lists?: string[];
  members?: string[];
  quota?: number;
  usedQuota?: number;
  enabledPermissions?: string[];
  disabledPermissions?: string[];
  externalMembers?: string[];
  urls?: string[];
  locale?: string;
  _id?: string | number;
}

export interface QueueMessage {
  id: number;
  return_path?: string;
  recipients?: QueueRecipient[];
  size?: number;
  created?: string;
  priority?: number;
  env_id?: string;
  blob_hash?: string;
}

export interface QueueRecipient {
  address: string;
  status?: RecipientStatus;
  queue?: string;
  retry_num?: number;
  next_retry?: string;
  expires?: string;
}

export type RecipientStatus =
  | 'scheduled'
  | 'completed'
  | 'temp_fail'
  | 'perm_fail'
  | { scheduled?: string; completed?: string; temp_fail?: string; perm_fail?: string };

export interface QueueListData {
  total?: number;
  items?: QueueMessage[];
}

export interface QueueReport {
  id?: string;
  domain?: string;
  policy_domain?: string;
  recipients?: string[];
  next_report?: string;
  next_delivery?: string;
  size?: number;
}

export interface ReceivedReport {
  id?: string;
  from?: string;
  domains?: string[];
  range_from?: string;
  range_to?: string;
  total_passes?: number;
  total_rejects?: number;
  total_quarantined?: number;
  total_success?: number;
  total_failures?: number;
  received?: string;
  typ?: string;
  feedback_type?: string;
  arrival_date?: string;
  total_incidents?: number;
  subject?: string;
  to?: string | string[];
  report?: unknown;
}

export interface LogItem {
  timestamp?: string;
  level?: string;
  event?: string;
  event_id?: string;
  details?: string;
  context?: unknown;
  message?: string;
  _key?: string;
  _cat?: string;
}

export interface LogListData {
  total?: number;
  items?: LogItem[];
}

export interface SettingsData {
  total?: number;
  items?: Record<string, string>;
}

export interface SpamClassifyRequest {
  message: string;
  remote_ip?: string;
  ehlo_domain?: string;
  authenticated_as?: string | null;
  is_tls?: boolean;
  env_from?: string;
  env_from_flags?: number;
  env_rcpt_to?: string[];
}

export interface SpamClassifyResult {
  score?: number;
  disposition?: Record<string, unknown>;
  tags?: Record<string, unknown>;
}

export interface DmarcTroubleshootRequest {
  remoteIp: string;
  ehloDomain: string;
  mailFrom: string;
  body?: string | null;
}

export interface DmarcTroubleshootResult {
  dmarcResult?: unknown;
  dmarcPass?: boolean;
  dkimResults?: unknown[];
  dkimPass?: boolean;
  spfEhloDomain?: string;
  spfEhloResult?: unknown;
  spfMailFromDomain?: string;
  spfMailFromResult?: unknown;
  ipRevResult?: unknown;
  ipRevPtr?: string[];
  arcResult?: unknown;
  dmarcPolicy?: unknown;
  elapsed?: number;
}

export interface ReloadResult {
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface PrincipalPatch {
  action: 'set' | 'addItem' | 'removeItem';
  field: string;
  value: unknown;
}

// ── 내부 fetch 헬퍼 ──────────────────────────────────────────────────────

async function mailReq<T = unknown>(
  method: string,
  path: string,
  params: Record<string, string | number> = {},
  body: unknown = null
): Promise<StalwartResponse<T>> {
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()
    : '';
  const url = `${MAIL_BASE}${path}${qs}`;
  const opts: RequestInit = { method, headers: {} };
  if (body !== null) {
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`${method} ${path}: ${res.status} ${text}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<StalwartResponse<T>>;
}

async function mailReqText(method: string, path: string, body: string): Promise<unknown> {
  const url = `${MAIL_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'text/plain' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path}: ${res.status} ${text}`);
  }
  return res.json().catch(() => ({ status: 'ok' }));
}

// ── API 객체 ──────────────────────────────────────────────────────────────

export const mailApi = {
  // ── Health / Version ──

  async getVersion() {
    return mailReq('POST', '/oauth', {}, {
      type: 'code',
      client_id: 'polyon',
      redirect_uri: 'stalwart://auth',
      nonce: 'v',
    });
  },

  // ── Principals ──

  listPrincipals(opts: { types?: string; limit?: number; page?: number; filter?: string } = {}) {
    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      limit: opts.limit ?? 25,
    };
    if (opts.types) params['types'] = opts.types;
    if (opts.filter) params['filter'] = opts.filter;
    return mailReq<PrincipalListData>('GET', '/principal', params);
  },

  getPrincipal(id: string | number) {
    return mailReq<Principal>('GET', `/principal/${encodeURIComponent(String(id))}`);
  },

  createPrincipal(data: Principal) {
    return mailReq<Principal>('POST', '/principal', {}, data);
  },

  updatePrincipal(id: string | number, patches: PrincipalPatch[]) {
    return mailReq('PATCH', `/principal/${encodeURIComponent(String(id))}`, {}, patches);
  },

  deletePrincipal(id: string | number) {
    return mailReq('DELETE', `/principal/${encodeURIComponent(String(id))}`);
  },

  // ── DKIM ──

  createDKIM(domain: string, algorithm = 'Ed25519') {
    return mailReq<string>('POST', '/dkim', {}, { id: null, algorithm, domain, selector: null });
  },

  // ── Queue Messages ──

  listQueue(opts: { page?: number; limit?: number; text?: string } = {}) {
    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      limit: opts.limit ?? 25,
    };
    if (opts.text) params['text'] = opts.text;
    return mailReq<QueueListData>('GET', '/queue/messages', params);
  },

  getQueueMessage(id: number) {
    return mailReq<QueueMessage>('GET', `/queue/messages/${id}`);
  },

  retryQueueMessage(id: number) {
    return mailReq('PATCH', `/queue/messages/${id}`, {}, { item: { retry: true } });
  },

  cancelQueueMessage(id: number) {
    return mailReq('DELETE', `/queue/messages/${id}`);
  },

  // ── Queue Reports ──

  listQueueReports(opts: { type?: string; limit?: number; page?: number } = {}) {
    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      limit: opts.limit ?? 25,
    };
    if (opts.type) params['type'] = opts.type;
    return mailReq<{ total?: number; items?: QueueReport[] }>('GET', '/queue/reports', params);
  },

  deleteQueueReport(id: string) {
    return mailReq('DELETE', `/queue/reports/${encodeURIComponent(id)}`);
  },

  // ── Received Reports ──

  listReceivedReports(type: string, opts: { page?: number; limit?: number } = {}) {
    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      limit: opts.limit ?? 25,
    };
    return mailReq<{ total?: number; items?: ReceivedReport[] }>('GET', `/reports/${type}`, params);
  },

  getReceivedReport(type: string, id: string) {
    return mailReq<ReceivedReport>('GET', `/reports/${type}/${encodeURIComponent(id)}`);
  },

  deleteReceivedReport(type: string, id: string) {
    return mailReq('DELETE', `/reports/${type}/${encodeURIComponent(id)}`);
  },

  // ── Logs ──

  listLogs(opts: { page?: number; limit?: number } = {}) {
    return mailReq<LogListData>('GET', '/logs/live', {
      page: opts.page ?? 1,
      limit: opts.limit ?? 50,
    });
  },

  // ── Settings ──

  getSettings(prefix = '') {
    const params: Record<string, string> = prefix ? { prefix } : {};
    return mailReq<SettingsData>('GET', '/settings/list', params);
  },

  updateSetting(key: string, value: string) {
    return mailReq('POST', '/settings', {}, [{ type: 'set', key, value }]);
  },

  deleteSetting(key: string) {
    return mailReq('POST', '/settings', {}, [{ type: 'clear', prefix: key }]);
  },

  reloadSettings(dryRun = false) {
    const params = dryRun ? { 'dry-run': 'true' } : {};
    return mailReq<ReloadResult>('GET', '/reload', params);
  },

  // ── Spam Filter ──

  spamClassify(req: SpamClassifyRequest) {
    return mailReq<SpamClassifyResult>('POST', '/spam-filter/classify', {}, req);
  },

  trainSpam(type: 'spam' | 'ham', message: string) {
    return mailReqText('POST', `/spam-filter/train/${type}`, message);
  },

  // ── Troubleshoot ──

  getTroubleshootToken() {
    return mailReq<string>('GET', '/troubleshoot/token');
  },

  troubleshootDmarc(req: DmarcTroubleshootRequest) {
    return mailReq<DmarcTroubleshootResult>('POST', '/troubleshoot/dmarc', {}, req);
  },

  // ── Maintenance ──

  maintenanceAction(apiPath: string) {
    return mailReq<ReloadResult>('GET', apiPath);
  },

  // ── Store ──

  purgeAccount(name: string) {
    return mailReq('GET', `/store/purge/account/${encodeURIComponent(name)}`);
  },
};

// ── 유틸리티 함수 ──────────────────────────────────────────────────────────

export function fmtBytes(b?: number): string {
  if (!b || b === 0) return '무제한';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(1)} GB`;
}

export function fmtDate(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtDateShort(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseSettingsItems(data: SettingsData): [string, string][] {
  const items = data?.items;
  if (!items) return [];
  return Object.entries(items).filter(([k]) => k !== 'total') as [string, string][];
}

export function statusTagClass(status?: string | RecipientStatus): string {
  if (!status) return 'gray';
  const key = typeof status === 'string' ? status : Object.keys(status)[0];
  const map: Record<string, string> = {
    scheduled: 'blue',
    completed: 'green',
    temp_fail: 'purple',
    perm_fail: 'red',
  };
  return map[key] ?? 'gray';
}

export function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return '알 수 없는 오류'; }
}

export function statusTagLabel(status?: string | RecipientStatus): string {
  if (!status) return '—';
  const key = typeof status === 'string' ? status : Object.keys(status)[0];
  const map: Record<string, string> = {
    scheduled: '대기',
    completed: '완료',
    temp_fail: '일시 실패',
    perm_fail: '영구 실패',
    queued: '큐',
    failed: '실패',
  };
  return map[key] ?? key;
}
