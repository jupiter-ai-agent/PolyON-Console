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
import { Wifi, UserMultiple, Group, Renew, Save, CloudUpload, Restart } from '@carbon/icons-react';
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
  import_enabled: boolean;
  import_interval: number;
  import_on_startup: boolean;
  update_existing_users: boolean;
  user_deletion_strategy: string;
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AppEngineLDAPPage() {
  const [configs, setConfigs] = useState<LDAPConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // active config (first by default)
  const [activeIdx, setActiveIdx] = useState(0);

  // edit state (Groups + Schedule tabs are editable)
  const [edits, setEdits] = useState<Partial<LDAPConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // connection test
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency_ms: number } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // sync / import
  const [actionLoading, setActionLoading] = useState<'sync' | 'import' | null>(null);
  const [actionResult, setActionResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Users modal
  const [usersOpen, setUsersOpen] = useState(false);
  const [users, setUsers] = useState<LDAPUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Groups modal
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groups, setGroups] = useState<LDAPGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const cfg = configs[activeIdx] ?? null;
  const merged: LDAPConfig | null = cfg ? { ...cfg, ...edits } : null;

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ configs: LDAPConfig[]; total: number }>('/appengine/ldap/config');
      setConfigs(data.configs ?? []);
      setEdits({});
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

  const runAction = async (action: 'sync' | 'import') => {
    if (!cfg) return;
    setActionLoading(action);
    setActionResult(null);
    try {
      const data = await apiFetch<{ status: string; result: string }>(
        `/appengine/ldap/${action}/${cfg.id}`, { method: 'POST' }
      );
      setActionResult({ ok: true, msg: data.result || (action === 'sync' ? '동기화 완료' : 'Import 완료') });
      await loadConfig(); // refresh sync status
    } catch (e) {
      setActionResult({ ok: false, msg: e instanceof Error ? e.message : `${action} 실패` });
    } finally {
      setActionLoading(null);
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

      {/* ── Toolbar ── */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #393939' }}>
        <Button kind="ghost" size="sm" renderIcon={Renew} onClick={loadConfig} disabled={loading}>
          새로고침
        </Button>
        <Button kind="secondary" size="sm" renderIcon={testLoading ? undefined : Wifi} onClick={testConnection} disabled={testLoading}>
          {testLoading ? <InlineLoading description="테스트 중..." /> : 'Test Connection'}
        </Button>
        <Button kind="ghost" size="sm" renderIcon={UserMultiple} onClick={openUsers} disabled={!cfg}>
          Test LDAP Users
        </Button>
        <Button kind="ghost" size="sm" renderIcon={Group} onClick={openGroups} disabled={!cfg}>
          Test LDAP Groups
        </Button>
        <div style={{ flex: 1 }} />
        {cfg && (
          <>
            <Button
              kind="ghost" size="sm" renderIcon={actionLoading === 'sync' ? undefined : Restart}
              onClick={() => runAction('sync')}
              disabled={!!actionLoading || !merged?.sync_groups}
            >
              {actionLoading === 'sync' ? <InlineLoading description="동기화 중..." /> : 'Sync All Users'}
            </Button>
            <Button
              kind="ghost" size="sm" renderIcon={actionLoading === 'import' ? undefined : CloudUpload}
              onClick={() => runAction('import')}
              disabled={!!actionLoading || !merged?.import_enabled}
            >
              {actionLoading === 'import' ? <InlineLoading description="Import 중..." /> : 'Import Now'}
            </Button>
          </>
        )}
        {hasEdits && (
          <Button kind="primary" size="sm" renderIcon={Save} onClick={saveEdits} disabled={saving}>
            {saving ? <InlineLoading description="저장 중..." /> : '저장'}
          </Button>
        )}
      </div>

      {/* ── Notifications ── */}
      <div style={{ padding: '0 16px' }}>
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
        {actionResult && (
          <div style={{ paddingTop: '8px' }}>
            <InlineNotification
              kind={actionResult.ok ? 'success' : 'error'}
              title={actionResult.ok ? '완료' : '실패'}
              subtitle={actionResult.msg}
              lowContrast onClose={() => setActionResult(null)}
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
        {error && (
          <div style={{ paddingTop: '8px' }}>
            <InlineNotification kind="error" title="오류" subtitle={error} lowContrast />
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && !cfg && (
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <Loading description="LDAP 설정 불러오는 중..." withOverlay={false} />
        </div>
      )}

      {/* ── Main tabs ── */}
      {merged && (
        <div style={{ padding: '0 16px' }}>
          <Tabs>
            <TabList aria-label="LDAP 설정 탭">
              <Tab>서버 정보</Tab>
              <Tab>사용자 설정</Tab>
              <Tab>그룹 설정</Tab>
              <Tab>자동 Import</Tab>
              <Tab>동기화 현황</Tab>
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

              {/* ── Tab 4: 자동 Import (편집 가능) ── */}
              <TabPanel>
                <div style={{ maxWidth: '520px', paddingTop: '16px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <Toggle
                      id="import_enabled"
                      labelText="Enable Scheduled Import"
                      toggled={merged.import_enabled}
                      onToggle={v => setEdit('import_enabled', v)}
                    />
                  </div>
                  {merged.import_enabled && (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <TextInput
                          id="import_interval"
                          labelText="Import Interval (minutes)"
                          value={String(merged.import_interval || 60)}
                          onChange={e => setEdit('import_interval', parseInt(e.target.value) || 60)}
                          type="number"
                          style={{ width: '160px' }}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <Toggle
                          id="import_on_startup"
                          labelText="Import on Startup"
                          toggled={merged.import_on_startup}
                          onToggle={v => setEdit('import_on_startup', v)}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <Toggle
                          id="update_existing_users"
                          labelText="Update Existing Users"
                          toggled={merged.update_existing_users}
                          onToggle={v => setEdit('update_existing_users', v)}
                        />
                      </div>
                      <div style={{ marginBottom: '16px' }}>
                        <Select
                          id="user_deletion_strategy"
                          labelText="User Deletion Strategy"
                          value={merged.user_deletion_strategy || 'deactivate'}
                          onChange={e => setEdit('user_deletion_strategy', e.target.value)}
                        >
                          <SelectItem value="deactivate" text="Deactivate User" />
                          <SelectItem value="delete" text="Delete User" />
                          <SelectItem value="nothing" text="Keep User" />
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </TabPanel>

              {/* ── Tab 5: 동기화 현황 (읽기 전용) ── */}
              <TabPanel>
                <div style={{ maxWidth: '600px', paddingTop: '16px' }}>
                  <ConfigSection title="Sync Status">
                    <ConfigRow label="Last Sync Date" value={merged.last_sync_date || '—'} />
                    <ConfigRow label="Last Sync Status" value={merged.last_sync_status || '—'} />
                    <ConfigRow label="Last Sync User Count" value={merged.last_sync_user_count ?? 0} />
                  </ConfigSection>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Button
                      kind="primary" size="sm" renderIcon={Restart}
                      onClick={() => runAction('sync')}
                      disabled={!!actionLoading || !merged.sync_groups}
                    >
                      {actionLoading === 'sync' ? <InlineLoading description="동기화 중..." /> : 'Sync All Users & Groups'}
                    </Button>
                    <Button
                      kind="secondary" size="sm" renderIcon={CloudUpload}
                      onClick={() => runAction('import')}
                      disabled={!!actionLoading || !merged.import_enabled}
                    >
                      {actionLoading === 'import' ? <InlineLoading description="Import 중..." /> : 'Import Now'}
                    </Button>
                  </div>
                  {!merged.import_enabled && (
                    <p style={{ fontSize: '0.8rem', color: '#6f6f6f', marginTop: '12px' }}>
                      Import Now 는 "자동 Import" 탭에서 활성화 후 사용 가능합니다.
                    </p>
                  )}
                </div>
              </TabPanel>

            </TabPanels>
          </Tabs>
        </div>
      )}

      {/* ── Users Modal ── */}
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

      {/* ── Groups Modal ── */}
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
