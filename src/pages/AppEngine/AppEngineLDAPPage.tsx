import { useState, useCallback, useEffect } from 'react';
import {
  Button,
  InlineNotification,
  Modal,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Loading,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Toggle,
  TextInput,
  Select,
  SelectItem,
  InlineLoading,
  StructuredListWrapper,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';
import { Wifi, UserMultiple, Group, Renew, Save, Restart } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { apiFetch } from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LDAPConfig {
  id: number;
  ldap_server: string;
  ldap_server_port: number;
  ldap_tls: boolean;
  ldap_binddn: string;
  ldap_base: string;
  ldap_filter: string;
  create_user: boolean;
  users_dn: string;
  auth_search_filter: string;
  user_search_filter: string;
  ldap_attr_login: string;
  ldap_attr_email: string;
  ldap_attr_firstname: string;
  ldap_attr_middlename: string;
  ldap_attr_lastname: string;
  ldap_attr_fullname: string;
  ldap_attr_jobtitle: string;
  ldap_attr_photo: string;
  groups_dn: string;
  group_filter: string;
  group_attribute: string;
  sync_groups: boolean;
  create_role_per_group: boolean;
  last_sync_date: string;
  last_sync_status: string;
  last_sync_user_count: number;
}

interface LDAPUser {
  screen_name: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  group_count: number;
  is_complete: boolean;
}

interface LDAPGroup {
  sequence: number;
  name: string;
  description: string;
  member_count: number;
}

interface WizardInfo {
  id: number;
  ldap_server_name: string;
  user_count: number;
  group_count: number;
  sync_user_count: number;
  selected_group_count: number;
  sync_enabled: boolean;
  sync_interval: number;
  last_sync_date: string;
  last_sync_status: string;
  last_sync_user_count: number;
}

interface WizardGroup {
  id: number;
  selected: boolean;
  sequence: number;
  name: string;
  description: string;
  member_count: number;
  ldap_dn: string;
}

interface WizardUser {
  id: number;
  sync_mode: 'group' | 'enable' | 'disable';
  is_sync_target: boolean;
  screen_name: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  group_count: number;
  ldap_dn: string;
}

interface WizardSchedule {
  id: number;
  sync_enabled: boolean;
  sync_interval: number;
  last_sync_date: string;
  last_sync_status: string;
  last_sync_user_count: number;
}

// ── Read-only config row ────────────────────────────────────────────────────

function ConfigRow({ label, value }: { label: string; value: string | boolean | number | null | undefined }) {
  return (
    <StructuredListRow>
      <StructuredListCell style={{ width: '220px', color: '#a8a8a8', fontSize: '0.875rem', paddingTop: '10px', paddingBottom: '10px' }}>
        {label}
      </StructuredListCell>
      <StructuredListCell style={{ fontSize: '0.875rem', paddingTop: '10px', paddingBottom: '10px' }}>
        {typeof value === 'boolean' ? (
          value ? <Tag type="green" size="sm">True</Tag> : <Tag type="gray" size="sm">False</Tag>
        ) : value ? (
          <span style={{ wordBreak: 'break-all', fontFamily: typeof value === 'string' && value.startsWith('(') ? 'IBM Plex Mono, monospace' : undefined }}>
            {value}
          </span>
        ) : (
          <span style={{ color: '#6f6f6f' }}>—</span>
        )}
      </StructuredListCell>
    </StructuredListRow>
  );
}

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </p>
      <StructuredListWrapper>
        <StructuredListBody>{children}</StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

// ── Editable field ─────────────────────────────────────────────────────────

function EditField({
  label, field, value, onChange, placeholder, mono,
}: {
  label: string; field: string; value: string; onChange: (f: string, v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <TextInput
        id={`ldap-${field}`}
        labelText={label}
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        style={mono ? { fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem' } : undefined}
      />
    </div>
  );
}

// ── Sync Mode Tag ──────────────────────────────────────────────────────────

function SyncModeTag({ mode }: { mode: string }) {
  if (mode === 'enable') return <Tag type="green" size="sm">Enable</Tag>;
  if (mode === 'disable') return <Tag type="red" size="sm">Disable</Tag>;
  return <Tag type="blue" size="sm">Group</Tag>;
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AppEngineLDAPPage() {
  const [configs, setConfigs] = useState<LDAPConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeIdx] = useState(0);

  const [edits, setEdits] = useState<Partial<LDAPConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms: number } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Test Users/Groups modals
  const [usersOpen, setUsersOpen] = useState(false);
  const [users, setUsers] = useState<LDAPUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groups, setGroups] = useState<LDAPGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  // Wizard state
  const [wizardInfo, setWizardInfo] = useState<WizardInfo | null>(null);
  const [wizardGroups, setWizardGroups] = useState<WizardGroup[]>([]);
  const [wizardUsers, setWizardUsers] = useState<WizardUser[]>([]);
  const [wizardSchedule, setWizardSchedule] = useState<WizardSchedule | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardRefreshing, setWizardRefreshing] = useState(false);
  const [wizardSyncing, setWizardSyncing] = useState(false);
  const [wizardActionResult, setWizardActionResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleLocal, setScheduleLocal] = useState<{ sync_enabled: boolean; sync_interval: number } | null>(null);
  const [mainTabIdx, setMainTabIdx] = useState(0);

  const cfg = configs[activeIdx] ?? null;
  const merged: LDAPConfig | null = cfg ? { ...cfg, ...edits } : null;

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ configs: LDAPConfig[]; total: number }>('/appengine/ldap/config');
      setConfigs(data.configs ?? []);
      setEdits({});
      setWizardInfo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '설정 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const setEdit = (field: string, value: unknown) => {
    setEdits(prev => ({ ...prev, [field]: value }));
  };

  const saveEdits = async () => {
    if (!cfg || Object.keys(edits).length === 0) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await apiFetch(`/appengine/ldap/config/${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify(edits),
      });
      setSaveResult({ ok: true, msg: '저장 완료' });
      await loadConfig();
    } catch (e) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await apiFetch<{ success: boolean; message: string; latency_ms: number }>(
        '/appengine/ldap/test-connection', { method: 'POST' }
      );
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : '테스트 실패', latency_ms: 0 });
    } finally {
      setTestLoading(false);
    }
  };

  const runSync = async () => {
    if (!cfg) return;
    setSyncLoading(true);
    setSyncResult(null);
    try {
      await apiFetch(`/appengine/ldap/sync/${cfg.id}`, { method: 'POST' });
      setSyncResult({ ok: true, msg: '동기화 완료' });
      await loadConfig();
    } catch (e) {
      setSyncResult({ ok: false, msg: e instanceof Error ? e.message : '동기화 실패' });
    } finally {
      setSyncLoading(false);
    }
  };

  const openUsers = async () => {
    setUsersOpen(true);
    setUsersLoading(true);
    setUsersError(null);
    setUserSearch('');
    try {
      const data = await apiFetch<{ users: LDAPUser[]; total: number }>(
        `/appengine/ldap/users${cfg ? `?ldap_id=${cfg.id}` : ''}`
      );
      setUsers(data.users ?? []);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : '사용자 조회 실패');
    } finally {
      setUsersLoading(false);
    }
  };

  const openGroups = async () => {
    setGroupsOpen(true);
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const data = await apiFetch<{ groups: LDAPGroup[]; total: number }>(
        `/appengine/ldap/groups${cfg ? `?ldap_id=${cfg.id}` : ''}`
      );
      setGroups(data.groups ?? []);
    } catch (e) {
      setGroupsError(e instanceof Error ? e.message : '그룹 조회 실패');
    } finally {
      setGroupsLoading(false);
    }
  };

  // ── Wizard functions ──────────────────────────────────────────────────────

  const loadWizardData = useCallback(async () => {
    if (!cfg) return;
    setWizardLoading(true);
    setWizardError(null);
    try {
      const [infoRes, groupsRes, usersRes, scheduleRes] = await Promise.all([
        apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`),
        apiFetch<{ groups: WizardGroup[] }>(`/appengine/ldap/wizard/groups?ldap_id=${cfg.id}`),
        apiFetch<{ users: WizardUser[] }>(`/appengine/ldap/wizard/users?ldap_id=${cfg.id}`),
        apiFetch<{ schedule: WizardSchedule }>(`/appengine/ldap/wizard/schedule?ldap_id=${cfg.id}`),
      ]);
      setWizardInfo(infoRes.wizard);
      setWizardGroups(groupsRes.groups ?? []);
      setWizardUsers(usersRes.users ?? []);
      setWizardSchedule(scheduleRes.schedule);
      setScheduleLocal({
        sync_enabled: scheduleRes.schedule.sync_enabled,
        sync_interval: scheduleRes.schedule.sync_interval,
      });
    } catch (e) {
      setWizardError(e instanceof Error ? e.message : 'Wizard 데이터 로드 실패');
    } finally {
      setWizardLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    if (mainTabIdx === 1 && cfg && !wizardInfo && !wizardLoading) {
      loadWizardData();
    }
  }, [mainTabIdx, cfg, wizardInfo, wizardLoading, loadWizardData]);

  const refreshWizard = async () => {
    if (!cfg) return;
    setWizardRefreshing(true);
    setWizardActionResult(null);
    try {
      const res = await apiFetch<{ wizard: WizardInfo; status: string }>(
        `/appengine/ldap/wizard/refresh?ldap_id=${cfg.id}`, { method: 'POST' }
      );
      if (res.wizard) setWizardInfo(res.wizard);
      // Reload groups & users after refresh
      const [groupsRes, usersRes] = await Promise.all([
        apiFetch<{ groups: WizardGroup[] }>(`/appengine/ldap/wizard/groups?ldap_id=${cfg.id}`),
        apiFetch<{ users: WizardUser[] }>(`/appengine/ldap/wizard/users?ldap_id=${cfg.id}`),
      ]);
      setWizardGroups(groupsRes.groups ?? []);
      setWizardUsers(usersRes.users ?? []);
      setWizardActionResult({ ok: true, msg: 'LDAP 데이터 갱신 완료' });
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : 'Refresh 실패' });
    } finally {
      setWizardRefreshing(false);
    }
  };

  const wizardSyncNow = async () => {
    if (!cfg) return;
    setWizardSyncing(true);
    setWizardActionResult(null);
    try {
      await apiFetch(`/appengine/ldap/wizard/sync?ldap_id=${cfg.id}`, { method: 'POST' });
      setWizardActionResult({ ok: true, msg: '동기화 완료' });
      // Refresh wizard info to update last_sync fields
      const infoRes = await apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`);
      setWizardInfo(infoRes.wizard);
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '동기화 실패' });
    } finally {
      setWizardSyncing(false);
    }
  };

  const toggleGroupSelected = async (groupId: number, selected: boolean) => {
    if (!cfg) return;
    // Optimistic update
    setWizardGroups(prev => prev.map(g => g.id === groupId ? { ...g, selected } : g));
    try {
      await apiFetch(`/appengine/ldap/wizard/groups?ldap_id=${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ groups: [{ id: groupId, selected }] }),
      });
      // Refresh wizard info for counter update
      const infoRes = await apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`);
      setWizardInfo(infoRes.wizard);
    } catch (e) {
      // Revert on error
      setWizardGroups(prev => prev.map(g => g.id === groupId ? { ...g, selected: !selected } : g));
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '그룹 변경 실패' });
    }
  };

  const selectAllGroups = async (select: boolean) => {
    if (!cfg) return;
    setWizardGroups(prev => prev.map(g => ({ ...g, selected: select })));
    try {
      await apiFetch(`/appengine/ldap/wizard/groups?ldap_id=${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify(select ? { select_all: true } : { deselect_all: true }),
      });
      const infoRes = await apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`);
      setWizardInfo(infoRes.wizard);
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '그룹 일괄 변경 실패' });
      loadWizardData();
    }
  };

  const setAllUserPolicy = async (policy: string) => {
    if (!cfg) return;
    setWizardUsers(prev => prev.map(u => ({ ...u, sync_mode: policy as WizardUser['sync_mode'] })));
    try {
      await apiFetch(`/appengine/ldap/wizard/users?ldap_id=${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ set_all: policy }),
      });
      const infoRes = await apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`);
      setWizardInfo(infoRes.wizard);
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '사용자 정책 일괄 변경 실패' });
      loadWizardData();
    }
  };

  // 개별 사용자 정책 변경 (즉시 반영)
  const setUserPolicy = async (userId: number, policy: string) => {
    if (!cfg) return;
    setWizardUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, sync_mode: policy as WizardUser['sync_mode'] } : u
    ));
    try {
      await apiFetch(`/appengine/ldap/wizard/users?ldap_id=${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify({ users: [{ id: userId, sync_mode: policy }] }),
      });
      const infoRes = await apiFetch<{ wizard: WizardInfo }>(`/appengine/ldap/wizard?ldap_id=${cfg.id}`);
      setWizardInfo(infoRes.wizard);
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '정책 변경 실패' });
      loadWizardData();
    }
  };

  const saveSchedule = async () => {
    if (!cfg || !scheduleLocal) return;
    setScheduleSaving(true);
    try {
      await apiFetch(`/appengine/ldap/wizard/schedule?ldap_id=${cfg.id}`, {
        method: 'PUT',
        body: JSON.stringify(scheduleLocal),
      });
      const res = await apiFetch<{ schedule: WizardSchedule }>(`/appengine/ldap/wizard/schedule?ldap_id=${cfg.id}`);
      setWizardSchedule(res.schedule);
      setWizardActionResult({ ok: true, msg: '스케줄 저장 완료' });
    } catch (e) {
      setWizardActionResult({ ok: false, msg: e instanceof Error ? e.message : '스케줄 저장 실패' });
    } finally {
      setScheduleSaving(false);
    }
  };

  const filteredUsers = userSearch
    ? users.filter(u =>
        `${u.screen_name} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
      <PageHeader
        title="AD / LDAP 연결 관리"
        description="AppEngine LDAP 설정 조회 · 테스트 · 동기화 제어"
      />

      {/* ── Top-level tabs: LDAP 연결 / Sync Wizard ── */}

      {/* 전역 에러 / 로딩 알림 */}
      {error && (
        <div style={{ padding: '0 16px', paddingTop: '8px' }}>
          <InlineNotification kind="error" title="오류" subtitle={error} lowContrast />
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !cfg && (
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <Loading description="LDAP 설정 불러오는 중..." withOverlay={false} />
        </div>
      )}

      {/* ── Main tabs ── */}
      {merged && (
        <div style={{ padding: '0 16px' }}>
          <Tabs selectedIndex={mainTabIdx} onChange={({ selectedIndex }) => setMainTabIdx(selectedIndex)}>
            <TabList aria-label="LDAP 관리 탭">
              <Tab>LDAP 연결</Tab>
              <Tab>Sync Wizard</Tab>
            </TabList>
            <TabPanels>

              {/* ══════════════════════════════════════════
                  Tab 1: LDAP 연결
                  ══════════════════════════════════════════ */}
              <TabPanel>
                {/* 연결 액션 바 */}
                <div style={{ paddingTop: '12px', paddingBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #393939', marginBottom: '4px' }}>
                  <Button kind="primary" size="sm" renderIcon={testLoading ? undefined : Wifi} onClick={testConnection} disabled={testLoading}>
                    {testLoading ? <InlineLoading description="테스트 중..." /> : 'Test Connection'}
                  </Button>
                  <Button kind="ghost" size="sm" renderIcon={UserMultiple} onClick={openUsers} disabled={!cfg}>
                    Test LDAP Users
                  </Button>
                  <Button kind="ghost" size="sm" renderIcon={Group} onClick={openGroups} disabled={!cfg}>
                    Test LDAP Groups
                  </Button>
                  <div style={{ flex: 1 }} />
                  {hasEdits && (
                    <Button kind="secondary" size="sm" renderIcon={Save} onClick={saveEdits} disabled={saving}>
                      {saving ? <InlineLoading description="저장 중..." /> : '저장'}
                    </Button>
                  )}
                </div>

                {/* 연결 / 저장 결과 알림 */}
                {testResult && (
                  <div style={{ paddingTop: '8px' }}>
                    <InlineNotification
                      kind={testResult.success ? 'success' : 'error'}
                      title={testResult.success ? '연결 성공' : '연결 실패'}
                      subtitle={`${testResult.message}${testResult.latency_ms > 0 ? ` (${testResult.latency_ms}ms)` : ''}`}
                      lowContrast onClose={() => setTestResult(null)}
                    />
                  </div>
                )}
                {saveResult && (
                  <div style={{ paddingTop: '8px' }}>
                    <InlineNotification
                      kind={saveResult.ok ? 'success' : 'error'}
                      title={saveResult.ok ? '저장 완료' : '저장 실패'}
                      subtitle={saveResult.msg}
                      lowContrast onClose={() => setSaveResult(null)}
                    />
                  </div>
                )}

                {/* 서버 정보 / 사용자 설정 / 그룹 설정 서브탭 */}
                <Tabs>
                  <TabList aria-label="LDAP 설정 서브탭">
                    <Tab>서버 정보</Tab>
                    <Tab>사용자 설정</Tab>
                    <Tab>그룹 설정</Tab>
                  </TabList>
                  <TabPanels>

              {/* ── Tab 1: 서버 정보 (읽기 전용) ── */}
              <TabPanel>
                <div style={{ maxWidth: '720px', paddingTop: '16px' }}>
                  <ConfigSection title="Server Information">
                    <ConfigRow label="LDAP Server Address" value={merged.ldap_server} />
                    <ConfigRow label="LDAP Server Port" value={merged.ldap_server_port} />
                    <ConfigRow label="Use TLS" value={merged.ldap_tls} />
                  </ConfigSection>
                  <ConfigSection title="Login Information">
                    <ConfigRow label="Bind DN" value={merged.ldap_binddn} />
                    <ConfigRow label="Password" value="••••••••••••" />
                  </ConfigSection>
                  <ConfigSection title="Process Parameter">
                    <ConfigRow label="LDAP Base" value={merged.ldap_base} />
                    <ConfigRow label="Authentication Filter" value={merged.ldap_filter} />
                    <ConfigRow label="Create User" value={merged.create_user} />
                  </ConfigSection>
                </div>
              </TabPanel>

              {/* ── Tab 2: 사용자 설정 (편집 가능) ── */}
              <TabPanel>
                <div style={{ maxWidth: '600px', paddingTop: '16px' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    Users
                  </p>
                  <EditField label="Users DN" field="users_dn" value={merged.users_dn} onChange={setEdit} placeholder="DC=cmars,DC=com" />
                  <EditField label="Auth Search Filter" field="auth_search_filter" value={merged.auth_search_filter} onChange={setEdit} mono />
                  <EditField label="User Search Filter" field="user_search_filter" value={merged.user_search_filter} onChange={setEdit} mono />

                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '24px 0 16px' }}>
                    User Mapping
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    <EditField label="Screen Name" field="ldap_attr_login" value={merged.ldap_attr_login} onChange={setEdit} placeholder="sAMAccountName" />
                    <EditField label="Last Name" field="ldap_attr_lastname" value={merged.ldap_attr_lastname} onChange={setEdit} placeholder="sn" />
                    <EditField label="Email Address" field="ldap_attr_email" value={merged.ldap_attr_email} onChange={setEdit} placeholder="userPrincipalName" />
                    <EditField label="Full Name" field="ldap_attr_fullname" value={merged.ldap_attr_fullname} onChange={setEdit} placeholder="displayName" />
                    <EditField label="First Name" field="ldap_attr_firstname" value={merged.ldap_attr_firstname} onChange={setEdit} placeholder="givenName" />
                    <EditField label="Job Title" field="ldap_attr_jobtitle" value={merged.ldap_attr_jobtitle} onChange={setEdit} placeholder="title" />
                    <EditField label="Middle Name" field="ldap_attr_middlename" value={merged.ldap_attr_middlename} onChange={setEdit} placeholder="middleName" />
                    <EditField label="Group Attribute" field="group_attribute" value={merged.group_attribute} onChange={setEdit} placeholder="memberOf" />
                  </div>
                </div>
              </TabPanel>

              {/* ── Tab 3: 그룹 설정 (편집 가능) ── */}
              <TabPanel>
                <div style={{ maxWidth: '600px', paddingTop: '16px' }}>
                  <EditField label="Groups DN" field="groups_dn" value={merged.groups_dn} onChange={setEdit} placeholder="DC=cmars,DC=com" />
                  <EditField label="Group Filter" field="group_filter" value={merged.group_filter} onChange={setEdit} placeholder="(objectClass=group)" mono />
                  <div style={{ marginBottom: '16px' }}>
                    <Toggle
                      id="sync_groups"
                      labelText="Sync AD Groups"
                      toggled={merged.sync_groups}
                      onToggle={v => setEdit('sync_groups', v)}
                    />
                  </div>
                  {merged.sync_groups && (
                    <div style={{ marginBottom: '16px' }}>
                      <Toggle
                        id="create_role_per_group"
                        labelText="Create Role Per Group"
                        toggled={merged.create_role_per_group}
                        onToggle={v => setEdit('create_role_per_group', v)}
                      />
                    </div>
                  )}
                </div>
              </TabPanel>

                  </TabPanels>
                </Tabs>
              </TabPanel>

              {/* ══════════════════════════════════════════
                  Tab 2: Sync Wizard
                  ══════════════════════════════════════════ */}
              <TabPanel>
                <div style={{ paddingTop: '16px' }}>
                  {/* Wizard loading / error */}
                  {wizardLoading && (
                    <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                      <Loading description="Wizard 데이터 로드 중..." withOverlay={false} />
                    </div>
                  )}
                  {wizardError && (
                    <InlineNotification kind="error" title="Wizard 오류" subtitle={wizardError} lowContrast />
                  )}
                  {wizardActionResult && (
                    <div style={{ marginBottom: '8px' }}>
                      <InlineNotification
                        kind={wizardActionResult.ok ? 'success' : 'error'}
                        title={wizardActionResult.ok ? '완료' : '실패'}
                        subtitle={wizardActionResult.msg}
                        lowContrast onClose={() => setWizardActionResult(null)}
                      />
                    </div>
                  )}

                  {!wizardLoading && wizardInfo && (
                    <>
                      {/* ── Wizard Header ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                        padding: '12px 0 16px', borderBottom: '1px solid #393939', marginBottom: '16px',
                      }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#8d8d8d', marginRight: '8px' }}>LDAP Server</span>
                          <span style={{ fontWeight: 600 }}>{wizardInfo.ldap_server_name || cfg?.ldap_server}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Tag type="blue" size="sm">
                            {wizardInfo.selected_group_count}/{wizardInfo.group_count} Groups Selected
                          </Tag>
                          <Tag type="green" size="sm">
                            {wizardInfo.sync_user_count}/{wizardInfo.user_count} Users Will Sync
                          </Tag>
                        </div>
                        <div style={{ flex: 1 }} />
                        <Button
                          kind="ghost" size="sm" renderIcon={wizardRefreshing ? undefined : Renew}
                          onClick={refreshWizard} disabled={wizardRefreshing}
                        >
                          {wizardRefreshing ? <InlineLoading description="Refresh 중..." /> : 'Refresh from LDAP'}
                        </Button>
                        <Button
                          kind="primary" size="sm" renderIcon={wizardSyncing ? undefined : Restart}
                          onClick={wizardSyncNow} disabled={wizardSyncing}
                        >
                          {wizardSyncing ? <InlineLoading description="동기화 중..." /> : 'Sync Now'}
                        </Button>
                      </div>

                      {/* ── Wizard Sub-tabs ── */}
                      <Tabs>
                        <TabList aria-label="Sync Wizard 서브탭">
                          <Tab>Groups</Tab>
                          <Tab>Users</Tab>
                          <Tab>Schedule</Tab>
                        </TabList>
                        <TabPanels>

                          {/* ── Groups 서브탭 ── */}
                          <TabPanel>
                            <div style={{ paddingTop: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <Button kind="secondary" size="sm" onClick={() => selectAllGroups(true)}>
                                  Select All
                                </Button>
                                <Button kind="ghost" size="sm" onClick={() => selectAllGroups(false)}>
                                  Deselect All
                                </Button>
                              </div>
                              <DataTable
                                rows={wizardGroups.map(g => ({
                                  id: String(g.id),
                                  _id: g.id,
                                  selected: g.selected,
                                  name: g.name,
                                  description: g.description || '',
                                  member_count: g.member_count,
                                }))}
                                headers={[
                                  { key: 'selected', header: 'Sync' },
                                  { key: 'name', header: 'Group Name' },
                                  { key: 'description', header: 'Description' },
                                  { key: 'member_count', header: 'Members' },
                                ]}
                              >
                                {({ rows, headers, getHeaderProps, getTableProps }) => (
                                  <TableContainer>
                                    <Table {...getTableProps()} size="sm">
                                      <TableHead>
                                        <TableRow>
                                          {headers.map(h => (
                                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                                              {h.header}
                                            </TableHeader>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {rows.map(row => {
                                          const grpId = Number(row.id);
                                          const grp = wizardGroups.find(g => g.id === grpId);
                                          return (
                                            <TableRow key={row.id}>
                                              {row.cells.map(cell => (
                                                <TableCell key={cell.id}>
                                                  {cell.info.header === 'selected' ? (
                                                    <Toggle
                                                      id={`grp-toggle-${grpId}`}
                                                      labelText=""
                                                      hideLabel
                                                      toggled={grp?.selected ?? false}
                                                      onToggle={v => toggleGroupSelected(grpId, v)}
                                                      size="sm"
                                                    />
                                                  ) : cell.info.header === 'member_count' ? (
                                                    <Tag type="blue" size="sm">{cell.value}</Tag>
                                                  ) : (
                                                    cell.value || <span style={{ color: '#6f6f6f' }}>—</span>
                                                  )}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                )}
                              </DataTable>
                            </div>
                          </TabPanel>

                          {/* ── Users 서브탭 ── */}
                          <TabPanel>
                            <div style={{ paddingTop: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <Button kind="ghost" size="sm" onClick={() => setAllUserPolicy('group')}>
                                  All Group Policy
                                </Button>
                                <Button kind="ghost" size="sm" onClick={() => setAllUserPolicy('enable')}>
                                  All Include
                                </Button>
                                <Button kind="ghost" size="sm" onClick={() => setAllUserPolicy('disable')}>
                                  All Exclude
                                </Button>
                              </div>
                              <DataTable
                                rows={wizardUsers.map(u => ({
                                  id: String(u.id),
                                  _id: u.id,
                                  sync_mode: u.sync_mode,
                                  is_sync_target: u.is_sync_target,
                                  screen_name: u.screen_name || '',
                                  email: u.email || '',
                                  first_name: u.first_name || '',
                                  last_name: u.last_name || '',
                                  job_title: u.job_title || '',
                                  group_count: u.group_count,
                                }))}
                                headers={[
                                  { key: 'sync_mode', header: 'Policy' },
                                  { key: 'is_sync_target', header: 'Sync' },
                                  { key: 'screen_name', header: 'Screen Name' },
                                  { key: 'email', header: 'Email' },
                                  { key: 'first_name', header: 'First Name' },
                                  { key: 'last_name', header: 'Last Name' },
                                  { key: 'job_title', header: 'Job Title' },
                                  { key: 'group_count', header: 'Groups' },
                                ]}
                              >
                                {({ rows, headers, getHeaderProps, getTableProps }) => (
                                  <TableContainer>
                                    <Table {...getTableProps()} size="sm">
                                      <TableHead>
                                        <TableRow>
                                          {headers.map(h => (
                                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                                              {h.header}
                                            </TableHeader>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {rows.map(row => {
                                          const userId = Number(row.id);
                                          const userSyncMode = wizardUsers.find(u => u.id === userId)?.sync_mode ?? 'group';
                                          return (
                                            <TableRow key={row.id}>
                                              {row.cells.map(cell => (
                                                <TableCell key={cell.id}>
                                                  {cell.info.header === 'sync_mode' ? (
                                                    <Select
                                                      id={`policy-${userId}`}
                                                      labelText=""
                                                      hideLabel
                                                      size="sm"
                                                      value={userSyncMode}
                                                      onChange={e => setUserPolicy(userId, e.target.value)}
                                                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                      style={{ minWidth: '130px' }}
                                                    >
                                                      <SelectItem value="group" text="Group Policy" />
                                                      <SelectItem value="enable" text="Include" />
                                                      <SelectItem value="disable" text="Exclude" />
                                                    </Select>
                                                  ) : cell.info.header === 'is_sync_target' ? (
                                                    cell.value
                                                      ? <Tag type="green" size="sm">Yes</Tag>
                                                      : <Tag type="gray" size="sm">No</Tag>
                                                  ) : cell.info.header === 'group_count' ? (
                                                    <Tag type="blue" size="sm">{cell.value}</Tag>
                                                  ) : (
                                                    cell.value || <span style={{ color: '#6f6f6f' }}>—</span>
                                                  )}
                                                </TableCell>
                                              ))}
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                )}
                              </DataTable>
                            </div>
                          </TabPanel>

                          {/* ── Schedule 서브탭 ── */}
                          <TabPanel>
                            <div style={{ maxWidth: '480px', paddingTop: '16px' }}>
                              {scheduleLocal && (
                                <>
                                  <div style={{ marginBottom: '20px' }}>
                                    <Toggle
                                      id="wizard_sync_enabled"
                                      labelText="Enable Auto Sync"
                                      toggled={scheduleLocal.sync_enabled}
                                      onToggle={v => setScheduleLocal(prev => prev ? { ...prev, sync_enabled: v } : prev)}
                                    />
                                  </div>
                                  <div style={{ marginBottom: '20px' }}>
                                    <TextInput
                                      id="wizard_sync_interval"
                                      labelText="Sync Interval (minutes)"
                                      value={String(scheduleLocal.sync_interval || 60)}
                                      onChange={e => setScheduleLocal(prev =>
                                        prev ? { ...prev, sync_interval: parseInt(e.target.value) || 60 } : prev
                                      )}
                                      type="number"
                                      style={{ width: '160px' }}
                                    />
                                  </div>
                                </>
                              )}

                              {wizardSchedule && (
                                <div style={{ marginBottom: '20px' }}>
                                  <ConfigSection title="Last Sync Info">
                                    <ConfigRow label="Last Sync Date" value={wizardSchedule.last_sync_date || '—'} />
                                    <ConfigRow label="Last Sync Status" value={wizardSchedule.last_sync_status || '—'} />
                                    <ConfigRow label="Last Sync User Count" value={wizardSchedule.last_sync_user_count ?? 0} />
                                  </ConfigSection>
                                </div>
                              )}

                              <Button
                                kind="primary" size="sm" renderIcon={Save}
                                onClick={saveSchedule} disabled={scheduleSaving}
                              >
                                {scheduleSaving ? <InlineLoading description="저장 중..." /> : '저장'}
                              </Button>
                            </div>
                          </TabPanel>

                        </TabPanels>
                      </Tabs>
                    </>
                  )}
                </div>
              </TabPanel>

            </TabPanels>
          </Tabs>
        </div>
      )}

      {/* ── Test Users Modal ── */}
      <Modal
        open={usersOpen}
        modalHeading={`LDAP Users${users.length > 0 ? ` (${users.length})` : ''}`}
        passiveModal
        onRequestClose={() => setUsersOpen(false)}
        size="lg"
      >
        {usersLoading && (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loading description="AD 사용자 조회 중..." withOverlay={false} />
          </div>
        )}
        {usersError && <InlineNotification kind="error" title="조회 실패" subtitle={usersError} lowContrast />}
        {!usersLoading && !usersError && (
          <>
            <div style={{ padding: '8px 0 12px' }}>
              <input
                type="text"
                placeholder="이름 / 이메일 검색..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', background: '#262626',
                  border: '1px solid #393939', color: '#f4f4f4', fontSize: '0.875rem',
                  borderRadius: '2px', outline: 'none',
                }}
              />
            </div>
            <DataTable
              rows={filteredUsers.map((u, i) => ({ id: String(i), ...u }))}
              headers={[
                { key: 'screen_name', header: 'Screen Name' },
                { key: 'email', header: 'Email' },
                { key: 'first_name', header: 'First Name' },
                { key: 'last_name', header: 'Last Name' },
                { key: 'job_title', header: 'Job Title' },
                { key: 'group_count', header: 'Groups' },
                { key: 'is_complete', header: '완성도' },
              ]}
            >
              {({ rows, headers, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow key={row.id}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'group_count' ? (
                                <Tag type="blue" size="sm">{cell.value}</Tag>
                              ) : cell.info.header === 'is_complete' ? (
                                cell.value ? <Tag type="green" size="sm">완전</Tag> : <Tag type="warm-gray" size="sm">미완성</Tag>
                              ) : cell.value || <span style={{ color: '#6f6f6f' }}>—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          </>
        )}
      </Modal>

      {/* ── Test Groups Modal ── */}
      <Modal
        open={groupsOpen}
        modalHeading={`LDAP Groups${groups.length > 0 ? ` (${groups.length})` : ''}`}
        passiveModal
        onRequestClose={() => setGroupsOpen(false)}
        size="lg"
      >
        {groupsLoading && (
          <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <Loading description="AD 그룹 조회 중..." withOverlay={false} />
          </div>
        )}
        {groupsError && <InlineNotification kind="error" title="조회 실패" subtitle={groupsError} lowContrast />}
        {!groupsLoading && !groupsError && (
          <DataTable
            rows={groups.map(g => ({ id: String(g.sequence), ...g }))}
            headers={[
              { key: 'sequence', header: '#' },
              { key: 'name', header: 'Name' },
              { key: 'description', header: 'Description' },
              { key: 'member_count', header: 'Members' },
            ]}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} size="sm">
                  <TableHead>
                    <TableRow>
                      {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'member_count' ? (
                              <Tag type="blue" size="sm">{cell.value}</Tag>
                            ) : cell.info.header === 'sequence' ? (
                              <span style={{ color: '#8d8d8d' }}>{cell.value}</span>
                            ) : cell.value || <span style={{ color: '#6f6f6f' }}>—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </Modal>
    </div>
  );
}
