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
  Tile,
  StructuredListWrapper,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';
import { Wifi, UserMultiple, Group, Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { apiFetch } from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LDAPConfig {
  server_address: string;
  server_port: number;
  use_tls: boolean;
  bind_dn: string;
  password: string;
  ldap_base: string;
  ldap_filter: string;
  create_user: boolean;
  template_user: string;
  users_dn: string;
  auth_search_filter: string;
  user_search_filter: string;
  mapping_screen_name: string;
  mapping_email: string;
  mapping_first_name: string;
  mapping_middle_name: string;
  mapping_last_name: string;
  mapping_full_name: string;
  mapping_job_title: string;
  mapping_group: string;
  groups_dn: string;
  group_filter: string;
  sync_ad_groups: boolean;
  create_role_per_group: boolean;
}

interface LDAPUser {
  screen_name: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  groups: string[];
  group_count: number;
}

interface LDAPGroup {
  index: number;
  name: string;
  description: string;
  member_count: number;
  dn: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms: number;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConfigSection({ title, rows }: { title: string; rows: { label: string; value: string | boolean | number }[] }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {title}
      </p>
      <StructuredListWrapper>
        <StructuredListBody>
          {rows.map(({ label, value }) => (
            <StructuredListRow key={label}>
              <StructuredListCell style={{ width: '220px', color: '#a8a8a8', fontSize: '0.875rem' }}>{label}</StructuredListCell>
              <StructuredListCell style={{ fontSize: '0.875rem', fontFamily: typeof value === 'string' && value.startsWith('(') ? 'IBM Plex Mono, monospace' : undefined }}>
                {typeof value === 'boolean' ? (
                  value ? <Tag type="green" size="sm">True</Tag> : <Tag type="gray" size="sm">False</Tag>
                ) : (
                  <span style={{ wordBreak: 'break-all' }}>{value}</span>
                )}
              </StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AppEngineLDAPPage() {
  const [config, setConfig] = useState<LDAPConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

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

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const data = await apiFetch<LDAPConfig>('/appengine/ldap/config');
      setConfig(data);
    } catch (e: unknown) {
      setConfigError(e instanceof Error ? e.message : '설정 조회 실패');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Load config on mount
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const testConnection = useCallback(async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await apiFetch<TestResult>('/appengine/ldap/test-connection', { method: 'POST' });
      setTestResult(data);
    } catch (e: unknown) {
      setTestResult({ success: false, message: e instanceof Error ? e.message : '연결 테스트 실패', latency_ms: 0 });
    } finally {
      setTestLoading(false);
    }
  }, []);

  const openUsers = useCallback(async () => {
    setUsersOpen(true);
    setUsersLoading(true);
    setUsersError(null);
    setUserSearch('');
    try {
      const data = await apiFetch<{ users: LDAPUser[]; total: number; truncated: boolean }>('/appengine/ldap/users?limit=200');
      setUsers(data.users ?? []);
    } catch (e: unknown) {
      setUsersError(e instanceof Error ? e.message : '사용자 조회 실패');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const openGroups = useCallback(async () => {
    setGroupsOpen(true);
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const data = await apiFetch<{ groups: LDAPGroup[]; total: number }>('/appengine/ldap/groups');
      setGroups(data.groups ?? []);
    } catch (e: unknown) {
      setGroupsError(e instanceof Error ? e.message : '그룹 조회 실패');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const filteredUsers = userSearch
    ? users.filter(u =>
        u.screen_name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div style={{ padding: '0 0 40px', height: '100%', overflowY: 'auto' }}>
      <PageHeader
        title="AD / LDAP 진단"
        description="PP 환경 고정 구성 · AppEngine이 자동으로 사용하는 값"
      />

      {/* Actions */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Renew}
          onClick={loadConfig}
          disabled={configLoading}
        >
          새로고침
        </Button>
        <Button
          kind={testResult ? (testResult.success ? 'primary' : 'danger') : 'secondary'}
          size="sm"
          renderIcon={testLoading ? undefined : Wifi}
          onClick={testConnection}
          disabled={testLoading}
        >
          {testLoading ? <Loading small withOverlay={false} description="" /> : 'Test Connection'}
        </Button>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={UserMultiple}
          onClick={openUsers}
        >
          Test LDAP Users
        </Button>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Group}
          onClick={openGroups}
        >
          Test LDAP Groups
        </Button>
      </div>

      {/* Connection test result */}
      {testResult && (
        <div style={{ padding: '12px 16px 0' }}>
          <InlineNotification
            kind={testResult.success ? 'success' : 'error'}
            title={testResult.success ? '연결 성공' : '연결 실패'}
            subtitle={`${testResult.message}${testResult.latency_ms > 0 ? ` (${testResult.latency_ms}ms)` : ''}`}
            lowContrast
            onClose={() => setTestResult(null)}
          />
        </div>
      )}

      {/* Config error */}
      {configError && (
        <div style={{ padding: '12px 16px 0' }}>
          <InlineNotification kind="error" title="설정 조회 실패" subtitle={configError} lowContrast />
        </div>
      )}

      {/* Config display */}
      {configLoading && !config && (
        <div style={{ padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
          <Loading description="설정 불러오는 중..." withOverlay={false} />
        </div>
      )}

      {config && (
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left column */}
          <div>
            <Tile style={{ padding: '20px', background: '#1c1c1c', border: '1px solid #393939' }}>
              <ConfigSection
                title="Server Information"
                rows={[
                  { label: 'LDAP Server Address', value: config.server_address },
                  { label: 'LDAP Server Port', value: config.server_port },
                  { label: 'Use TLS', value: config.use_tls },
                ]}
              />
              <ConfigSection
                title="Login Information"
                rows={[
                  { label: 'LDAP Bind DN', value: config.bind_dn },
                  { label: 'LDAP Password', value: config.password },
                ]}
              />
              <ConfigSection
                title="Process Parameter"
                rows={[
                  { label: 'LDAP Base', value: config.ldap_base },
                  { label: 'LDAP Filter', value: config.ldap_filter },
                ]}
              />
              <ConfigSection
                title="User Information"
                rows={[
                  { label: 'Create User', value: config.create_user },
                  { label: 'Template User', value: config.template_user },
                ]}
              />
            </Tile>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Tile style={{ padding: '20px', background: '#1c1c1c', border: '1px solid #393939' }}>
              <ConfigSection
                title="Users"
                rows={[
                  { label: 'Users DN', value: config.users_dn },
                  { label: 'Auth Search Filter', value: config.auth_search_filter },
                  { label: 'User Search Filter', value: config.user_search_filter },
                ]}
              />
              <ConfigSection
                title="User Mapping"
                rows={[
                  { label: 'Screen Name', value: config.mapping_screen_name },
                  { label: 'Email Address', value: config.mapping_email },
                  { label: 'First Name', value: config.mapping_first_name },
                  { label: 'Middle Name', value: config.mapping_middle_name },
                  { label: 'Last Name', value: config.mapping_last_name },
                  { label: 'Full Name', value: config.mapping_full_name },
                  { label: 'Job Title', value: config.mapping_job_title },
                  { label: 'Group', value: config.mapping_group },
                ]}
              />
            </Tile>

            <Tile style={{ padding: '20px', background: '#1c1c1c', border: '1px solid #393939' }}>
              <ConfigSection
                title="Groups"
                rows={[
                  { label: 'Groups DN', value: config.groups_dn },
                  { label: 'Group Filter', value: config.group_filter },
                  { label: 'Sync AD Groups', value: config.sync_ad_groups },
                  { label: 'Create Role Per Group', value: config.create_role_per_group },
                ]}
              />
            </Tile>
          </div>
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
            <Loading description="사용자 조회 중..." withOverlay={false} />
          </div>
        )}
        {usersError && <InlineNotification kind="error" title="조회 실패" subtitle={usersError} lowContrast />}
        {!usersLoading && !usersError && (
          <>
            <div style={{ padding: '8px 0 12px' }}>
              <input
                type="text"
                placeholder="검색..."
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
              ]}
            >
              {({ rows, headers, getHeaderProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map(header => (
                          <TableHeader {...getHeaderProps({ header })} key={header.key}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow key={row.id}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'group_count' ? (
                                <Tag type="blue" size="sm">{cell.value}</Tag>
                              ) : (
                                cell.value || <span style={{ color: '#6f6f6f' }}>—</span>
                              )}
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
            <Loading description="그룹 조회 중..." withOverlay={false} />
          </div>
        )}
        {groupsError && <InlineNotification kind="error" title="조회 실패" subtitle={groupsError} lowContrast />}
        {!groupsLoading && !groupsError && (
          <DataTable
            rows={groups.map(g => ({ id: String(g.index), ...g }))}
            headers={[
              { key: 'index', header: '#' },
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
                      {headers.map(header => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'member_count' ? (
                              <Tag type="blue" size="sm">{cell.value}</Tag>
                            ) : cell.info.header === 'index' ? (
                              <span style={{ color: '#8d8d8d' }}>{cell.value}</span>
                            ) : (
                              cell.value || <span style={{ color: '#6f6f6f' }}>—</span>
                            )}
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
