// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Tile,
  Tag,
  Button,
  TextInput,
  Dropdown,
  InlineNotification,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  InlineLoading,
  Toggle,
} from '@carbon/react';

const BASE = '/api/v1';

const METHOD_ITEMS = [
  { id: 'GET', label: 'GET' },
  { id: 'POST', label: 'POST' },
  { id: 'PUT', label: 'PUT' },
  { id: 'DELETE', label: 'DELETE' },
];

const ROLE_ITEMS = [
  { id: 'admin', label: 'admin' },
  { id: 'manager', label: 'manager' },
  { id: 'member', label: 'member' },
  { id: 'viewer', label: 'viewer' },
];

const PERMISSION_MATRIX = [
  { path: '사용자 관리', admin: '전체', manager: '조회+수정', member: null, viewer: null },
  { path: '그룹 관리', admin: '전체', manager: '조회+수정', member: null, viewer: null },
  { path: '보안 설정', admin: '전체', manager: '조회', member: null, viewer: null },
  { path: '시스템 설정', admin: '전체', manager: null, member: null, viewer: null },
  { path: '앱 사용', admin: '전체', manager: '전체', member: '전체', viewer: '조회' },
  { path: '대시보드', admin: '전체', manager: '전체', member: '전체', viewer: '전체' },
];

function PermCell({ value }: { value: string | null }) {
  if (!value) return <Tag type="red" size="sm">거부</Tag>;
  if (value === '전체') return <Tag type="green" size="sm">전체</Tag>;
  if (value === '조회+수정') return <Tag type="blue" size="sm">조회+수정</Tag>;
  if (value === '조회') return <Tag type="teal" size="sm">조회</Tag>;
  return <Tag type="gray" size="sm">{value}</Tag>;
}

export default function SecurityAccessPolicyPage() {
  const [status, setStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // 역할 매핑 state
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [originalRoleMap, setOriginalRoleMap] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [newRole, setNewRole] = useState({ id: 'admin', label: 'admin' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveNotification, setSaveNotification] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Policy test state
  const [testUser, setTestUser] = useState('');
  const [testGroups, setTestGroups] = useState('');
  const [testMethod, setTestMethod] = useState({ id: 'GET', label: 'GET' });
  const [testPath, setTestPath] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ allowed: boolean; user_role?: string; reason?: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/policy/status`)
      .then(r => r.json())
      .then(d => { setStatus(d); setStatusLoading(false); })
      .catch(() => setStatusLoading(false));

    fetch(`${BASE}/policy/roles`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = d?.roles ?? d ?? {};
        setRoleMap(map);
        setOriginalRoleMap(map);
        setRolesLoading(false);
      })
      .catch(() => {
        setRolesLoading(false);
      });
  }, []);

  const updateDirty = (map: Record<string, string>) => {
    setDirty(JSON.stringify(map) !== JSON.stringify(originalRoleMap));
  };

  const handleDeleteRole = (group: string) => {
    const next = { ...roleMap };
    delete next[group];
    setRoleMap(next);
    updateDirty(next);
  };

  const handleAddRole = () => {
    if (!newGroup.trim()) return;
    const next = { ...roleMap, [newGroup.trim()]: newRole.id };
    setRoleMap(next);
    setNewGroup('');
    setNewRole({ id: 'admin', label: 'admin' });
    updateDirty(next);
  };

  const handleSaveRoles = async () => {
    setSaveLoading(true);
    setSaveNotification(null);
    try {
      const res = await fetch(`${BASE}/policy/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleMap),
      });
      if (!res.ok) throw new Error('save failed');
      setOriginalRoleMap({ ...roleMap });
      setDirty(false);
      setSaveNotification({ kind: 'success', msg: '역할 매핑이 저장되었습니다' });
    } catch {
      setSaveNotification({ kind: 'error', msg: '저장에 실패했습니다. 다시 시도해 주세요' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const groups = testGroups.split(',').map(g => g.trim()).filter(Boolean);
      const res = await fetch(`${BASE}/policy/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: testUser, groups, method: testMethod.id, path: testPath }),
      });
      const data = await res.json();
      const allowed = !!(data?.result?.allow ?? data?.result?.allowed ?? data?.result);
      const user_role = data?.result?.user_role ?? data?.user_role ?? null;
      const reason = data?.result?.reason ?? data?.reason ?? null;
      setTestResult({ allowed, user_role, reason });
    } catch {
      setTestResult({ allowed: false, reason: '테스트 요청 실패' });
    } finally {
      setTestLoading(false);
    }
  };

  const roleTagType = (role: string) => {
    if (role === 'admin') return 'purple';
    if (role === 'manager') return 'blue';
    if (role === 'member') return 'teal';
    return 'gray';
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>접근 정책</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            PolyON 리소스에 대한 접근 제어 정책을 관리합니다
          </p>
        </div>
        <Button
          kind="primary"
          size="md"
          disabled={!dirty || saveLoading}
          onClick={handleSaveRoles}
        >
          {saveLoading ? '저장 중...' : '저장'}
        </Button>
      </div>

      {/* 저장 알림 */}
      {saveNotification && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind={saveNotification.kind}
            title={saveNotification.msg}
            hideCloseButton={false}
            onClose={() => setSaveNotification(null)}
          />
        </div>
      )}

      {/* OPA 상태 카드 */}
      <Tile style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>OPA 상태</h4>
            {statusLoading ? (
              <InlineLoading description="로딩 중..." />
            ) : status ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>연결 상태:</span>
                <Tag type={status.healthy ? 'green' : 'red'} size="sm">
                  {status.healthy ? 'Healthy' : 'Down'}
                </Tag>
                <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>정책 로드:</span>
                <Tag type={status.policy_loaded ? 'green' : 'gray'} size="sm">
                  {status.policy_loaded ? '로드됨' : '미로드'}
                </Tag>
                <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>모드:</span>
                <Tag type="blue" size="sm">Fail-Open</Tag>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>OPA 상태를 가져올 수 없습니다</span>
            )}
          </div>
          <div>
            <Toggle
              id="policy-engine-toggle"
              labelText="정책 엔진"
              labelA="OFF"
              labelB="ON"
              toggled={true}
              disabled={true}
            />
            <p style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>
              향후 활성화 예정
            </p>
          </div>
        </div>
      </Tile>

      {/* 역할 매핑 섹션 */}
      <Tile style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>AD 그룹 역할 매핑</h4>
        <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '0 0 16px' }}>
          Active Directory 그룹을 PolyON 역할에 매핑합니다
        </p>

        {rolesLoading ? (
          <InlineLoading description="로딩 중..." />
        ) : (
          <>
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>AD 그룹</StructuredListCell>
                  <StructuredListCell head>역할</StructuredListCell>
                  <StructuredListCell head></StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {Object.entries(roleMap).length === 0 ? (
                  <StructuredListRow>
                    <StructuredListCell colSpan={3}>
                      <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>매핑된 그룹이 없습니다</span>
                    </StructuredListCell>
                  </StructuredListRow>
                ) : (
                  Object.entries(roleMap).map(([group, role]) => (
                    <StructuredListRow key={group}>
                      <StructuredListCell>{group}</StructuredListCell>
                      <StructuredListCell>
                        <Tag type={roleTagType(role)} size="sm">{role}</Tag>
                      </StructuredListCell>
                      <StructuredListCell>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(group)}
                        >
                          삭제
                        </Button>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))
                )}
              </StructuredListBody>
            </StructuredListWrapper>

            {/* 추가 행 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <TextInput
                  id="new-group"
                  labelText="AD 그룹명"
                  placeholder="예: PolyON-Admins"
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                />
              </div>
              <div style={{ flex: '0 0 160px' }}>
                <Dropdown
                  id="new-role"
                  titleText="역할"
                  label="역할 선택"
                  items={ROLE_ITEMS}
                  itemToString={item => item?.label ?? ''}
                  selectedItem={newRole}
                  onChange={({ selectedItem }) => selectedItem && setNewRole(selectedItem)}
                />
              </div>
              <div style={{ paddingBottom: '1px' }}>
                <Button
                  kind="primary"
                  size="sm"
                  disabled={!newGroup.trim()}
                  onClick={handleAddRole}
                >
                  추가
                </Button>
              </div>
            </div>
          </>
        )}
      </Tile>

      {/* 역할별 권한 매트릭스 */}
      <Tile style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>역할별 접근 권한</h4>
        <StructuredListWrapper>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>경로</StructuredListCell>
              <StructuredListCell head>admin</StructuredListCell>
              <StructuredListCell head>manager</StructuredListCell>
              <StructuredListCell head>member</StructuredListCell>
              <StructuredListCell head>viewer</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {PERMISSION_MATRIX.map((row, i) => (
              <StructuredListRow key={i}>
                <StructuredListCell>{row.path}</StructuredListCell>
                <StructuredListCell><PermCell value={row.admin} /></StructuredListCell>
                <StructuredListCell><PermCell value={row.manager} /></StructuredListCell>
                <StructuredListCell><PermCell value={row.member} /></StructuredListCell>
                <StructuredListCell><PermCell value={row.viewer} /></StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </Tile>

      {/* 정책 테스트 섹션 */}
      <Tile>
        <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>정책 테스트</h4>
        <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '0 0 16px' }}>
          사용자와 경로를 입력하여 접근 허용 여부를 즉시 확인합니다
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px 1fr', gap: '12px', marginBottom: '12px' }}>
          <TextInput
            id="test-user"
            labelText="사용자명"
            placeholder="예: john.doe"
            value={testUser}
            onChange={e => setTestUser(e.target.value)}
          />
          <TextInput
            id="test-groups"
            labelText="그룹 (쉼표 구분)"
            placeholder="예: PolyON-Admins, Domain Admins"
            value={testGroups}
            onChange={e => setTestGroups(e.target.value)}
          />
          <Dropdown
            id="test-method"
            titleText="HTTP 메서드"
            label="GET"
            items={METHOD_ITEMS}
            itemToString={item => item?.label ?? ''}
            selectedItem={testMethod}
            onChange={({ selectedItem }) => selectedItem && setTestMethod(selectedItem)}
          />
          <TextInput
            id="test-path"
            labelText="경로"
            placeholder="예: /api/v1/users"
            value={testPath}
            onChange={e => setTestPath(e.target.value)}
          />
        </div>
        <Button
          kind="primary"
          size="md"
          onClick={handleTest}
          disabled={testLoading || !testUser || !testPath}
        >
          {testLoading ? '테스트 중...' : '테스트'}
        </Button>

        {testResult !== null && (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                borderLeft: `4px solid ${testResult.allowed ? '#24a148' : '#da1e28'}`,
                padding: '16px',
                background: testResult.allowed ? 'var(--cds-layer-01)' : 'var(--cds-layer-01)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Tag type={testResult.allowed ? 'green' : 'red'} size="md">
                  {testResult.allowed ? '허용됨' : '거부됨'}
                </Tag>
                {testResult.user_role && (
                  <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                    판정 역할: <Tag type={roleTagType(testResult.user_role)} size="sm">{testResult.user_role}</Tag>
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
                {testResult.allowed
                  ? '해당 사용자는 이 리소스에 접근할 수 있습니다'
                  : testResult.reason
                    ? testResult.reason
                    : '해당 사용자는 이 리소스에 접근할 수 없습니다'}
              </p>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
}
