// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TextInput,
  Select,
  SelectItem,
  Button,
  Tag,
  InlineNotification,
  InlineLoading,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';
import {
  Security,
  Renew,
  CheckmarkFilled,
  ErrorFilled,
  Play,
  Add,
  TrashCan,
  Save,
} from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

// ── 타입 정의 ─────────────────────────────────────────────────────────────────
interface PolicyStatus {
  healthy: boolean;
  policy_loaded: boolean;
  mode: string;
}

interface RoleEntry {
  username: string;
  role: string;
}

interface TestResult {
  input: { user: string; roles: string[]; method: string; path: string };
  result: { allow?: boolean; current_role?: string };
}

interface DecisionEntry {
  id?: string;
  action?: string;
  resource_type?: string;
  actor?: string;
  details?: string;
  created_at?: string;
}

const ROLES = ['superadmin', 'admin', 'operator', 'member'];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const roleColor = (role: string) => {
  switch (role) {
    case 'superadmin': return 'red';
    case 'admin': return 'purple';
    case 'operator': return 'blue';
    case 'member': return 'green';
    default: return 'gray';
  }
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function PolicyPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Security size={20} />
          정책 관리
        </h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          OPA RBAC 정책 상태, 역할 매핑, 테스트, 판정 로그
        </p>
      </div>

      <Tabs>
        <TabList aria-label="정책 관리 탭">
          <Tab>상태</Tab>
          <Tab>역할 매핑</Tab>
          <Tab>정책 테스트</Tab>
          <Tab>결정 로그</Tab>
        </TabList>
        <TabPanels>
          <TabPanel><StatusTab /></TabPanel>
          <TabPanel><RoleMappingTab /></TabPanel>
          <TabPanel><PolicyTestTab /></TabPanel>
          <TabPanel><DecisionLogTab /></TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

// ── 탭 1: 상태 ────────────────────────────────────────────────────────────────
function StatusTab() {
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ status: string; data: PolicyStatus }>('/policy/status');
      setStatus((data as any).data || data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleStructure = [
    { role: 'superadmin', desc: '모든 권한 — 시스템 전체 제어', badge: 'red' },
    { role: 'admin', desc: '사용자/앱/서비스 관리 (정책 변경 불가)', badge: 'purple' },
    { role: 'operator', desc: '모니터링/읽기 + 서비스 재시작', badge: 'blue' },
    { role: 'member', desc: 'Portal + 본인 계정만', badge: 'green' },
  ];

  return (
    <div style={{ paddingTop: '16px' }}>
      {loading && <InlineLoading description="OPA 상태 확인 중..." />}
      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton />
      )}
      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--cds-layer)', padding: '20px', borderRadius: '4px', border: '1px solid var(--cds-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {status.healthy
                ? <CheckmarkFilled size={20} style={{ color: '#24a148' }} />
                : <ErrorFilled size={20} style={{ color: '#da1e28' }} />}
              <span style={{ fontWeight: 600 }}>OPA 연결</span>
            </div>
            <Tag type={status.healthy ? 'green' : 'red'}>
              {status.healthy ? '연결됨' : '연결 실패'}
            </Tag>
          </div>
          <div style={{ background: 'var(--cds-layer)', padding: '20px', borderRadius: '4px', border: '1px solid var(--cds-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {status.policy_loaded
                ? <CheckmarkFilled size={20} style={{ color: '#24a148' }} />
                : <ErrorFilled size={20} style={{ color: '#da1e28' }} />}
              <span style={{ fontWeight: 600 }}>정책 로드</span>
            </div>
            <Tag type={status.policy_loaded ? 'green' : 'red'}>
              {status.policy_loaded ? '로드됨' : '미로드'}
            </Tag>
          </div>
        </div>
      )}
      {status && (
        <div style={{ marginBottom: '16px' }}>
          <Tag type="blue">모드: {status.mode || 'fail-open'}</Tag>
          <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
            OPA 오류 시 요청을 허용합니다 (서비스 연속성 보장)
          </span>
        </div>
      )}
      <Button kind="ghost" size="sm" onClick={load} renderIcon={Renew}>새로고침</Button>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>역할 구조</h3>
        <StructuredListWrapper>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>역할</StructuredListCell>
              <StructuredListCell head>설명</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {roleStructure.map(r => (
              <StructuredListRow key={r.role}>
                <StructuredListCell>
                  <Tag type={r.badge as any}>{r.role}</Tag>
                </StructuredListCell>
                <StructuredListCell>{r.desc}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </div>
    </div>
  );
}

// ── 탭 2: 역할 매핑 ───────────────────────────────────────────────────────────
function RoleMappingTab() {
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newRole, setNewRole] = useState('member');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any>('/policy/roles');
      const map = data?.data?.role_map || data?.role_map || {};
      setRoleMap(map);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/policy/roles', {
        method: 'PUT',
        body: JSON.stringify(roleMap),
      });
      setSuccess('역할 매핑이 저장되었습니다');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addEntry = () => {
    if (!newUser.trim()) return;
    setRoleMap(prev => ({ ...prev, [newUser.trim()]: newRole }));
    setNewUser('');
    setNewRole('member');
  };

  const removeEntry = (username: string) => {
    setRoleMap(prev => {
      const next = { ...prev };
      delete next[username];
      return next;
    });
  };

  const entries = Object.entries(roleMap);

  const headers = [
    { key: 'username', header: '사용자명' },
    { key: 'role', header: '역할' },
    { key: 'actions', header: '' },
  ];

  const rows = entries.map(([username, role]) => ({
    id: username,
    username,
    role,
  }));

  if (loading) return <InlineLoading description="역할 매핑 로드 중..." style={{ paddingTop: '16px' }} />;

  return (
    <div style={{ paddingTop: '16px' }}>
      {error && <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton style={{ marginBottom: '16px' }} />}
      {success && <InlineNotification kind="success" title="완료" subtitle={success} hideCloseButton style={{ marginBottom: '16px' }} />}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
        <TextInput
          id="new-user"
          labelText="사용자명"
          value={newUser}
          onChange={e => setNewUser(e.target.value)}
          placeholder="username"
          style={{ maxWidth: '200px' }}
        />
        <Select
          id="new-role"
          labelText="역할"
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          style={{ maxWidth: '160px' }}
        >
          {ROLES.map(r => <SelectItem key={r} value={r} text={r} />)}
        </Select>
        <Button kind="secondary" renderIcon={Add} onClick={addEntry}>추가</Button>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>역할 매핑이 없습니다</p>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      <TableCell>{row.cells[0].value}</TableCell>
                      <TableCell>
                        <Tag type={roleColor(row.cells[1].value) as any}>{row.cells[1].value}</Tag>
                      </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Select
                            id={`role-${row.id}`}
                            labelText=""
                            hideLabel
                            value={row.cells[1].value}
                            onChange={e => setRoleMap(prev => ({ ...prev, [row.id]: e.target.value }))}
                            size="sm"
                            style={{ maxWidth: '140px' }}
                          >
                            {ROLES.map(r => <SelectItem key={r} value={r} text={r} />)}
                          </Select>
                          <Button
                            kind="danger--ghost"
                            size="sm"
                            hasIconOnly
                            renderIcon={TrashCan}
                            iconDescription="삭제"
                            onClick={() => removeEntry(row.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <Button onClick={save} renderIcon={Save} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </Button>
        <Button kind="ghost" onClick={load} renderIcon={Renew}>새로고침</Button>
      </div>
    </div>
  );
}

// ── 탭 3: 정책 테스트 ─────────────────────────────────────────────────────────
function PolicyTestTab() {
  const [user, setUser] = useState('');
  const [roles, setRoles] = useState('member');
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/users');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const rolesArr = roles.split(',').map(r => r.trim()).filter(Boolean);
      const data = await apiFetch<any>('/policy/test', {
        method: 'POST',
        body: JSON.stringify({ user, roles: rolesArr, method, path }),
      });
      setResult(data?.data || data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const allowed = result?.result?.allow;

  return (
    <div style={{ paddingTop: '16px', maxWidth: '640px' }}>
      <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', marginBottom: '16px' }}>
        역할·경로·메서드를 입력하고 허용 여부를 확인합니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <TextInput
          id="test-user"
          labelText="사용자명"
          value={user}
          onChange={e => setUser(e.target.value)}
          placeholder="cmars"
        />
        <TextInput
          id="test-roles"
          labelText="역할 (쉼표 구분)"
          value={roles}
          onChange={e => setRoles(e.target.value)}
          placeholder="superadmin, admin"
        />
        <Select
          id="test-method"
          labelText="HTTP Method"
          value={method}
          onChange={e => setMethod(e.target.value)}
        >
          {METHODS.map(m => <SelectItem key={m} value={m} text={m} />)}
        </Select>
        <TextInput
          id="test-path"
          labelText="경로"
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="/users"
        />
      </div>

      <Button onClick={runTest} renderIcon={Play} disabled={loading}>
        {loading ? '테스트 중...' : '테스트 실행'}
      </Button>

      {error && <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton style={{ marginTop: '16px' }} />}

      {result && (
        <div style={{ marginTop: '20px', padding: '20px', background: 'var(--cds-layer)', border: `2px solid ${allowed ? '#24a148' : '#da1e28'}`, borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            {allowed
              ? <CheckmarkFilled size={24} style={{ color: '#24a148' }} />
              : <ErrorFilled size={24} style={{ color: '#da1e28' }} />}
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {allowed ? '허용 (ALLOW)' : '거부 (DENY)'}
            </span>
          </div>
          {result.result?.current_role && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>판정된 역할: </span>
              <Tag type={roleColor(result.result.current_role) as any}>{result.result.current_role}</Tag>
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', fontFamily: 'monospace', background: 'var(--cds-background)', padding: '8px', borderRadius: '2px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({ input: result.input, result: result.result }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 탭 4: 결정 로그 ───────────────────────────────────────────────────────────
function DecisionLogTab() {
  const [entries, setEntries] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any>('/policy/decisions');
      const list = data?.data?.entries || data?.entries || [];
      setEntries(list);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const headers = [
    { key: 'actor', header: '사용자' },
    { key: 'action', header: '액션' },
    { key: 'resource_type', header: '리소스' },
    { key: 'details', header: '상세' },
    { key: 'created_at', header: '시각' },
  ];

  const rows = entries.map((e, i) => ({
    id: String(e.id || i),
    actor: e.actor || '-',
    action: e.action || '-',
    resource_type: e.resource_type || '-',
    details: e.details || '-',
    created_at: e.created_at ? new Date(e.created_at).toLocaleString('ko-KR') : '-',
  }));

  if (loading) return <InlineLoading description="결정 로그 로드 중..." style={{ paddingTop: '16px' }} />;

  return (
    <div style={{ paddingTop: '16px' }}>
      {error && <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton style={{ marginBottom: '16px' }} />}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <Button kind="ghost" size="sm" onClick={load} renderIcon={Renew}>새로고침</Button>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>판정 로그가 없습니다</p>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()} size="sm">
                <TableHead>
                  <TableRow>
                    {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map(cell => <TableCell key={cell.id}>{cell.value}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
}
