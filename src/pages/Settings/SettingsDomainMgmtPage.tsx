// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Tile,
  Button,
  TextInput,
  InlineNotification,
  SkeletonText,
  Tag,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi, type ServiceDomainSettings, type AppEntry } from '../../api/settings';

interface StepResult {
  name?: string;
  step?: string;
  status: string;
  message?: string;
}

const STEP_STYLE: Record<string, { type: 'green' | 'red' | 'yellow' | 'gray'; label: string }> = {
  ok:      { type: 'green',  label: '완료' },
  skipped: { type: 'gray',   label: '건너뜀' },
  failed:  { type: 'red',    label: '실패' },
  pending: { type: 'yellow', label: '대기' },
};

// Foundation 서비스 — 편집/삭제 불가
const FOUNDATION_IDS = new Set([
  'sso', 'mail', 'search', 'portal', 'notification',
]);

// 설치된 앱만 표시하기 위한 활성 상태
const ACTIVE_STATUSES = new Set(['active', 'requires-setup', 'installed']);

export default function SettingsDomainMgmtPage() {
  const [cfg, setCfg] = useState<ServiceDomainSettings>({});
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<StepResult[]>([]);

  // Edit form
  const [baseDomain, setBaseDomain] = useState('');
  const [consoleDomain, setConsoleDomain] = useState('');
  const [portalDomain, setPortalDomain] = useState('');

  // App subdomain status
  const [appSubdomains, setAppSubdomains] = useState<Record<string, string>>({});
  const [appStatus, setAppStatus] = useState<Record<string, { msg: string; type: 'success' | 'error' }>>({});

  useEffect(() => {
    loadDomainSettings();
    loadApps();
  }, []);

  async function loadDomainSettings() {
    setLoadingCfg(true);
    try {
      const data = await settingsApi.getDomainSettings();
      setCfg(data);
      setBaseDomain(data.base_domain || '');
      setConsoleDomain(data.console_domain || '');
      setPortalDomain(data.portal_domain || '');
    } catch { /**/ }
    finally { setLoadingCfg(false); }
  }

  async function loadApps() {
    setLoadingApps(true);
    try {
      const data = await settingsApi.listApps();
      const list = Array.isArray(data) ? data : (data as { apps?: AppEntry[] }).apps || [];
      // 설치된 앱만 필터 (Foundation active + installed modules)
      const installed = list.filter(a =>
        (a.backend_url || a.backendUrl) &&
        ACTIVE_STATUSES.has(a.base_status || a.baseStatus || '')
      );
      setApps(installed);
      const subs: Record<string, string> = {};
      installed.forEach(a => { subs[a.id] = a.subdomain || ''; });
      setAppSubdomains(subs);
    } catch { /**/ }
    finally { setLoadingApps(false); }
  }

  async function saveDomainSettings() {
    const body: ServiceDomainSettings = {};
    if (baseDomain) body.base_domain = baseDomain;
    if (consoleDomain) body.console_domain = consoleDomain;
    if (portalDomain) body.portal_domain = portalDomain;

    if (!Object.keys(body).length) {
      setError('변경할 도메인을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    setSteps([]);
    try {
      const res = await settingsApi.putDomainSettings(body);
      if (res.success || res.steps) {
        setCfg(prev => ({ ...prev, ...body }));
        if (res.steps) setSteps(res.steps);
        loadApps();
      } else {
        setError(res.error || '저장 실패');
      }
    } catch (e) {
      setError('서버 오류: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setAppDomain(app: AppEntry) {
    const subdomain = appSubdomains[app.id] || '';
    if (!subdomain) {
      setAppStatus(prev => ({ ...prev, [app.id]: { msg: '서브도메인을 입력하세요.', type: 'error' } }));
      return;
    }
    try {
      const res = await settingsApi.putAppDomain(app.id, { subdomain });
      if (res.success || res.id) {
        setApps(prev => prev.map(a => a.id === app.id ? { ...a, subdomain } : a));
        setAppStatus(prev => ({ ...prev, [app.id]: { msg: '저장됨', type: 'success' } }));
        setTimeout(() => setAppStatus(prev => { const n = { ...prev }; delete n[app.id]; return n; }), 3000);
      } else {
        setAppStatus(prev => ({ ...prev, [app.id]: { msg: res.error || '설정 실패', type: 'error' } }));
      }
    } catch (e) {
      setAppStatus(prev => ({ ...prev, [app.id]: { msg: (e as Error).message, type: 'error' } }));
    }
  }

  async function removeAppDomain(app: AppEntry) {
    if (!window.confirm(`"${app.name || app.id}" 앱의 서브도메인 설정을 제거하시겠습니까?`)) return;
    try {
      await settingsApi.deleteAppDomain(app.id);
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, subdomain: undefined } : a));
      setAppSubdomains(prev => ({ ...prev, [app.id]: '' }));
    } catch (e) {
      setAppStatus(prev => ({ ...prev, [app.id]: { msg: (e as Error).message, type: 'error' } }));
    }
  }

  const isFoundation = (id: string) => FOUNDATION_IDS.has(id);

  // Build DataTable rows — no internal URLs, Foundation locked
  const appHeaders = [
    { key: 'appName', header: '서비스' },
    { key: 'domain', header: '현재 도메인' },
    { key: 'subdomainInput', header: '서브도메인' },
  ];

  const appRows = apps.map(app => {
    const currentDomain = app.subdomain && baseDomain
      ? `${app.subdomain}.${baseDomain}`
      : app.subdomain || '';
    const st = appStatus[app.id];
    const locked = isFoundation(app.id);

    return {
      id: app.id,
      appName: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{app.name || app.id}</span>
          {locked && <Tag type="blue" size="sm">Foundation</Tag>}
        </div>
      ),
      domain: currentDomain ? (
        <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}>{currentDomain}</code>
      ) : (
        <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>미설정</span>
      ),
      subdomainInput: locked ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>시스템 관리</span>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TextInput
              id={`sub-${app.id}`}
              labelText=""
              placeholder="subdomain"
              value={appSubdomains[app.id] || ''}
              onChange={e => setAppSubdomains(prev => ({ ...prev, [app.id]: e.target.value }))}
              style={{ width: 160 }}
              hideLabel
            />
            <Button kind="primary" size="sm" onClick={() => setAppDomain(app)}>설정</Button>
            {app.subdomain && (
              <Button kind="ghost" size="sm" onClick={() => removeAppDomain(app)} style={{ color: 'var(--cds-support-error)' }}>제거</Button>
            )}
          </div>
          {st && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: st.type === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)' }}>
              {st.msg}
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="도메인 관리"
        description="기본 도메인 및 서비스별 서브도메인 설정"
      />

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} onCloseButtonClick={() => setError('')} style={{ marginBottom: '1rem' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Domain Settings */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>기본 도메인 설정</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>Operator 설치 시 설정된 도메인</p>
            </div>
            <Button kind="primary" onClick={saveDomainSettings} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>

          {loadingCfg ? (
            <SkeletonText paragraph lines={3} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <TextInput
                id="baseDomain"
                labelText="기본 도메인"
                value={baseDomain}
                onChange={e => setBaseDomain(e.target.value)}
              />
              <TextInput
                id="consoleDomain"
                labelText="콘솔 도메인"
                value={consoleDomain}
                onChange={e => setConsoleDomain(e.target.value)}
              />
              <TextInput
                id="portalDomain"
                labelText="포털 도메인"
                value={portalDomain}
                onChange={e => setPortalDomain(e.target.value)}
              />
            </div>
          )}

          {steps.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', margin: '0 0 0.5rem' }}>적용 단계</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {steps.map((s, i) => {
                  const st = STEP_STYLE[s.status] || STEP_STYLE.pending;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, minWidth: 80 }}>{s.name || s.step}</span>
                      <Tag type={st.type}>{st.label}</Tag>
                      {s.message && <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>{s.message}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Tile>

        {/* Service Domain Mappings */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>서비스 도메인 매핑</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>설치된 서비스의 외부 접근 도메인</p>
            </div>
            <Button kind="ghost" renderIcon={Renew} onClick={loadApps} disabled={loadingApps}>
              새로고침
            </Button>
          </div>

          {loadingApps ? (
            <SkeletonText paragraph lines={3} />
          ) : apps.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: 0 }}>
                설치된 서비스가 없습니다
              </p>
            </div>
          ) : (
            <DataTable rows={appRows} headers={appHeaders}>
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map(h => (
                        <TableHeader
                          {...getHeaderProps({ header: h })}
                          key={h.key}
                          style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)' }}
                        >
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map(cell => (
                          <TableCell key={cell.id} style={{ verticalAlign: 'middle' }}>
                            {cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )}
        </Tile>
      </div>
    </>
  );
}
