import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TableBatchActions,
  TableBatchAction,
  TableSelectAll,
  TableSelectRow,
  Button,
  Tag,
  Modal,
  TextInput,
  Select,
  SelectItem,
  Checkbox,
  Loading,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Tabs,
  TabList,
  Tab,
  Pagination,
  PasswordInput,
  FormLabel,
} from '@carbon/react';
import {
  Add,
  Renew,
  Download,
  TrashCan,
  Edit,
  Password,
  UserAvatar,
  Close,
  Filter,
  UserMultiple,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  enableUser,
  disableUser,
  resetPassword,
  addMember,
  listGroups,
  userPhotoUrl,
  type User,
  type Group,
} from '../../api/users';
import { useAppStore } from '../../store/useAppStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModalState {
  mode: 'none' | 'create' | 'edit' | 'delete' | 'resetPw' | 'detail';
  user?: User;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function extractCN(dn: string): string {
  const m = dn.match(/^CN=([^,]+)/i);
  return m ? m[1] : dn;
}

const SYSTEM_GROUPS = new Set([
  'Administrators','Users','Guests','Backup Operators','Server Operators',
  'Account Operators','Print Operators','Replicator','Domain Admins','Domain Users',
  'Domain Guests','Domain Computers','Domain Controllers','Schema Admins',
  'Enterprise Admins','Cert Publishers','DnsAdmins','DnsUpdateProxy',
  'Group Policy Creator Owners','Protected Users','Read-only Domain Controllers',
  'Enterprise Read-only Domain Controllers','Allowed RODC Password Replication Group',
  'Denied RODC Password Replication Group','RAS and IAS Servers','Remote Desktop Users',
  'Performance Monitor Users','Performance Log Users','Distributed COM Users',
  'Certificate Service DCOM Access','Event Log Readers','Cryptographic Operators',
  'Network Configuration Operators','Incoming Forest Trust Builders',
  'Terminal Server License Servers','Windows Authorization Access Group',
  'Pre-Windows 2000 Compatible Access','IIS_IUSRS',
]);

// ─── UserDetailPanel ──────────────────────────────────────────────────────────

interface DetailPanelProps {
  user: User;
  groups: Group[];
  domainLower: string;
  onClose: () => void;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
  onResetPw: (u: User) => void;
  onRefresh: () => void;
}

function UserDetailPanel({ user, groups, domainLower, onClose, onEdit, onDelete, onResetPw }: DetailPanelProps) {
  const [detail, setDetail] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [addGroupName, setAddGroupName] = useState('');
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    setLoading(true);
    getUser(user.username)
      .then((u) => setDetail(u))
      .catch(() => setDetail(user))
      .finally(() => setLoading(false));
  }, [user.username]);

  const memberGroups = (detail?.member_of || []).map(extractCN).filter(Boolean);
  const orgGroups = groups.filter((g) => !SYSTEM_GROUPS.has(g.name));

  const handleRemoveGroup = async (groupName: string) => {
    try {
      const { removeMember } = await import('../../api/users');
      await removeMember(groupName, user.username);
      showToast(`'${user.username}'이(가) '${groupName}'에서 제거됨`, 'success');
      setDetail((d) => d ? { ...d, member_of: d.member_of?.filter((g) => extractCN(g) !== groupName) } : d);
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleAddGroup = async () => {
    if (!addGroupName) return;
    try {
      await addMember(addGroupName, user.username);
      showToast(`'${user.username}'이(가) '${addGroupName}'에 추가됨`, 'success');
      setAddGroupName('');
      const u = await getUser(user.username);
      setDetail(u);
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const upn = `${user.username}@${domainLower}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{user.username}</span>
        <Button kind="ghost" renderIcon={Close} iconDescription="닫기" hasIconOnly onClick={onClose} />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><Loading small description="로딩 중" withOverlay={false} /></div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
            <div style={{ width: 64, height: 64, overflow: 'hidden', background: 'var(--cds-layer-02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--cds-border-subtle)' }}>
              <img
                src={userPhotoUrl(user.username)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <UserAvatar size={32} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                {[detail?.given_name, detail?.surname].filter(Boolean).join(' ') || user.username}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', fontFamily: 'IBM Plex Mono' }}>{upn}</div>
            </div>
            <Tag type={user.enabled ? 'green' : 'red'}>
              {user.enabled ? '활성' : '비활성'}
            </Tag>
          </div>

          {/* Basic info */}
          <div style={{ marginBottom: '1.25rem' }}>
            {[
              { label: 'Username', value: user.username },
              { label: 'Given Name', value: detail?.given_name || '—' },
              { label: 'Surname', value: detail?.surname || '—' },
              { label: '계정 메일', value: upn },
              { label: '외부 메일', value: detail?.mail || '—' },
              { label: '생성일', value: detail?.when_created || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: '0.5rem', padding: '4px 0', fontSize: '0.8125rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ width: 100, flexShrink: 0, color: 'var(--cds-text-secondary)' }}>{label}</span>
                <span style={{ flex: 1, wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Groups */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <FormLabel>그룹 멤버십 ({memberGroups.length})</FormLabel>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem' }}>
              {memberGroups.map((g) => (
                <Tag key={g} type="blue" filter onClose={() => handleRemoveGroup(g)}>
                  {g}
                </Tag>
              ))}
              {!memberGroups.length && <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>그룹 없음</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Select
                id="addGroupSelect"
                labelText=""
                value={addGroupName}
                onChange={(e) => setAddGroupName(e.target.value)}
                style={{ flex: 1 }}
               
              >
                <SelectItem value="" text="그룹 선택" />
                {orgGroups.map((g) => (
                  <SelectItem key={g.name} value={g.name} text={g.name} />
                ))}
              </Select>
              <Button kind="secondary" onClick={handleAddGroup} disabled={!addGroupName}>
                추가
              </Button>
            </div>
          </div>

          {/* DN */}
          {detail?.dn && (
            <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-placeholder)', fontFamily: 'IBM Plex Mono', wordBreak: 'break-all', marginBottom: '1.25rem' }}>
              {detail.dn}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--cds-border-subtle)', paddingTop: '1rem' }}>
            <Button renderIcon={Edit} onClick={() => onEdit(user)}>편집</Button>
            <Button kind="secondary" renderIcon={Password} onClick={() => onResetPw(user)}>비밀번호 변경</Button>
            <Button kind="danger--ghost" renderIcon={TrashCan} onClick={() => onDelete(user)}>삭제</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CreateEditModal ──────────────────────────────────────────────────────────

interface CreateEditModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  user?: User;
  groups: Group[];
  domainLower: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEditModal({ open, mode, user, groups, domainLower, onClose, onSuccess }: CreateEditModalProps) {
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [username, setUsername] = useState('');
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [orgGroup, setOrgGroup] = useState('');
  const [enableMail, setEnableMail] = useState(true);
  const [enableDrive, setEnableDrive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const showToast = useAppStore((s) => s.showToast);

  const orgGroups = groups.filter((g) => !SYSTEM_GROUPS.has(g.name));

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        setSurname(user.surname || '');
        setGivenName(user.given_name || '');
        setUsername(user.username);
        setMail(user.mail || '');
        setPassword('');
        setOrgGroup('');
      } else {
        setSurname('');
        setGivenName('');
        setUsername('');
        setMail('');
        setPassword(generatePassword());
        setOrgGroup('');
        setEnableMail(true);
        setEnableDrive(true);
      }
      setError('');
    }
  }, [open, mode, user]);

  const handleSubmit = async () => {
    setError('');
    if (!surname || !givenName) { setError('성과 이름은 필수입니다'); return; }
    if (mode === 'create' && (!username || !password)) { setError('아이디와 비밀번호는 필수입니다'); return; }
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await createUser({ username, password, given_name: givenName, surname, mail: mail || undefined, enable_mail: enableMail, enable_drive: enableDrive });
        if (orgGroup) {
          try { await addMember(orgGroup, username); } catch {}
        }
        showToast(`'${username}' 사용자가 생성되었습니다`, 'success');
      } else if (user) {
        await updateUser(user.username, { given_name: givenName, surname, mail: mail || undefined });
        showToast(`'${user.username}' 정보가 수정되었습니다`, 'success');
      }
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      modalHeading={mode === 'create' ? '사용자 추가' : `사용자 편집 — ${user?.username}`}
      primaryButtonText={mode === 'create' ? '생성' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSubmit}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={submitting}
     
    >
      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <TextInput
          id="surname"
          labelText="성 (Surname) *"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder="홍"
        />
        <TextInput
          id="givenName"
          labelText="이름 (Given Name) *"
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          placeholder="길동"
        />
      </div>

      {mode === 'create' && (
        <TextInput
          id="username"
          labelText="아이디 (Username) *"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="gd.hong"
          style={{ marginTop: '1rem' }}
          helperText={username ? `${username}@${domainLower}` : '소문자 영문/숫자 (예: gd.hong)'}
        />
      )}

      {mode === 'create' && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <PasswordInput
            id="password"
            labelText="비밀번호 *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            kind="ghost"
           
            renderIcon={Renew}
            iconDescription="재생성"
            hasIconOnly
            onClick={() => setPassword(generatePassword())}
            style={{ marginBottom: 2 }}
          />
        </div>
      )}

      <TextInput
        id="mail"
        labelText="외부 메일"
        value={mail}
        onChange={(e) => setMail(e.target.value)}
        placeholder="개인 또는 외부 이메일"
        style={{ marginTop: '1rem' }}
      />

      {mode === 'create' && (
        <>
          <Select
            id="orgGroup"
            labelText="소속 조직"
            value={orgGroup}
            onChange={(e) => setOrgGroup(e.target.value)}
            style={{ marginTop: '1rem' }}
          >
            <SelectItem value="" text="— 선택 안 함 —" />
            {orgGroups.map((g) => (
              <SelectItem key={g.name} value={g.name} text={g.name} />
            ))}
          </Select>

          <div style={{ marginTop: '1rem' }}>
            <FormLabel>서비스 활성화</FormLabel>
            <Checkbox id="enableMail" labelText="메일 계정 생성" checked={enableMail} onChange={(_e, { checked }) => setEnableMail(checked)} />
            <Checkbox id="enableDrive" labelText="Drive 개인 폴더 생성" checked={enableDrive} onChange={(_e, { checked }) => setEnableDrive(checked)} />
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  open: boolean;
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteModal({ open, user, onClose, onSuccess }: DeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useAppStore((s) => s.showToast);

  const handleDelete = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await deleteUser(user.username);
      showToast(`'${user.username}' 사용자가 삭제되었습니다`, 'success');
      onSuccess();
      onClose();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      danger
      modalHeading="사용자 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      onRequestSubmit={handleDelete}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={submitting}
      size="xs"
    >
      <p>
        <strong>{user?.username}</strong> 사용자를 삭제하시겠습니까?
        <br />이 작업은 되돌릴 수 없습니다.
      </p>
    </Modal>
  );
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

interface ResetPwModalProps {
  open: boolean;
  user?: User;
  onClose: () => void;
}

function ResetPwModal({ open, user, onClose }: ResetPwModalProps) {
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    if (open) setPw(generatePassword());
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !pw) return;
    setSubmitting(true);
    try {
      await resetPassword(user.username, pw);
      showToast('비밀번호가 변경되었습니다', 'success');
      onClose();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      modalHeading={`비밀번호 변경 — ${user?.username}`}
      primaryButtonText="변경"
      secondaryButtonText="취소"
      onRequestSubmit={handleSubmit}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={submitting || !pw}
      size="xs"
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <PasswordInput
          id="newPw"
          labelText="새 비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button
          kind="ghost"
         
          renderIcon={Renew}
          iconDescription="재생성"
          hasIconOnly
          onClick={() => setPw(generatePassword())}
          style={{ marginBottom: 2 }}
        />
      </div>
    </Modal>
  );
}

// ─── Main UsersPage ───────────────────────────────────────────────────────────

const PAGE_SIZES = [20, 50, 100];

const TABLE_HEADERS = [
  { key: 'username', header: 'Username' },
  { key: 'displayName', header: '이름' },
  { key: 'org', header: '조직' },
  { key: 'upn', header: '계정 메일' },
  { key: 'mail', header: '외부 메일' },
  { key: 'groups', header: 'Groups' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: '' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(0); // 0=active, 1=disabled, 2=all
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: 'none' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const domainLower = useAppStore((s) => s.domainInfo.realmLower) || 'example.com';
  const showToast = useAppStore((s) => s.showToast);
  const didMount = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, gRes] = await Promise.all([listUsers(), listGroups()]);
      setUsers((uRes.users || []).filter((u) => u.username !== 'krbtgt'));
      setGroups(gRes.groups || []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; loadData(); }
  }, [loadData]);

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (statusFilter === 0 && !u.enabled) return false;
    if (statusFilter === 1 && u.enabled) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const display = [u.given_name, u.surname].filter(Boolean).join(' ').toLowerCase();
      if (
        !(u.username || '').toLowerCase().includes(q) &&
        !display.includes(q) &&
        !(u.mail || '').toLowerCase().includes(q) &&
        !(u.dn || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Pagination
  const totalItems = filteredUsers.length;
  const start = (page - 1) * pageSize;
  const pageUsers = filteredUsers.slice(start, start + pageSize);

  // Build row data
  const rows = pageUsers.map((u) => {
    const display = [u.given_name, u.surname].filter(Boolean).join(' ') || u.cn || '—';
    const groupCount = (u.member_of || []).filter(Boolean).length;
    const orgGroup = (u.member_of || []).find((g) => extractCN(g).startsWith('SG-ORG-'));
    const orgLabel = orgGroup ? extractCN(orgGroup).replace('SG-ORG-', '') : '';
    return {
      id: u.username,
      username: u.username,
      displayName: display,
      org: orgLabel,
      upn: `${u.username}@${domainLower}`,
      mail: u.mail || '—',
      groups: groupCount,
      status: u.enabled,
      _raw: u,
    };
  });

  const handleToggleUser = async (u: User) => {
    try {
      if (u.enabled) await disableUser(u.username);
      else await enableUser(u.username);
      showToast(`'${u.username}' ${u.enabled ? '비활성화' : '활성화'} 완료`, 'success');
      await loadData();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const downloadCSV = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ['Username', 'Display Name', '계정 메일', '외부 메일', 'Groups', 'Status', 'Created', 'DN'];
    const csvRows = [headers.map(esc).join(',')];
    for (const u of users) {
      csvRows.push([
        esc(u.username),
        esc([u.given_name, u.surname].filter(Boolean).join(' ') || u.cn),
        esc(`${u.username}@${domainLower}`),
        esc(u.mail),
        esc((u.member_of || []).map(extractCN).join('; ')),
        esc(u.enabled ? 'Active' : 'Disabled'),
        esc(u.when_created),
        esc(u.dn),
      ].join(','));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyon-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <PageHeader
          title={`사용자 관리 ${!loading ? `(${filteredUsers.length})` : ''}`}
          description="Active Directory 사용자 관리"
          actions={
            <Button renderIcon={Add} onClick={() => setModal({ mode: 'create' })}>
              Add User
            </Button>
          }
        />

        {error && (
          <InlineNotification kind="error" title="로딩 오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loading description="사용자 목록 로딩 중" withOverlay={false} />
          </div>
        ) : (
          <>
            {/* Status filter tabs */}
            <div style={{ marginBottom: '0.5rem' }}>
              <Tabs selectedIndex={statusFilter} onChange={({ selectedIndex }) => { setStatusFilter(selectedIndex); setPage(1); }}>
                <TabList contained aria-label="사용자 상태 필터">
                  <Tab>{`활성 사용자 (${users.filter((u) => u.enabled).length})`}</Tab>
                  <Tab>{`비활성 (${users.filter((u) => !u.enabled).length})`}</Tab>
                  <Tab>{`전체 (${users.length})`}</Tab>
                </TabList>
              </Tabs>
            </div>

            <DataTable rows={rows} headers={TABLE_HEADERS} isSortable>
              {({
                rows: tableRows,
                headers,
                getHeaderProps,
                getRowProps,
                getTableProps,
                getToolbarProps,
                getSelectionProps,
                getBatchActionProps,
                selectedRows,
                onInputChange,
              }) => (
                <TableContainer>
                  <TableToolbar {...getToolbarProps()}>
                    <TableBatchActions {...getBatchActionProps()}>
                      <TableBatchAction
                        renderIcon={TrashCan}
                        onClick={async () => {
                          if (!confirm(`${selectedRows.length}명의 사용자를 삭제하시겠습니까?`)) return;
                          for (const r of selectedRows) {
                            try { await deleteUser(r.id); } catch {}
                          }
                          showToast(`${selectedRows.length}명 삭제 완료`, 'success');
                          await loadData();
                          getBatchActionProps().onCancel();
                        }}
                      >
                        삭제
                      </TableBatchAction>
                    </TableBatchActions>
                    <TableToolbarContent>
                      <TableToolbarSearch
                        placeholder="사용자 검색..."
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setSearchQuery(e.target.value);
                          onInputChange(e as unknown as Parameters<typeof onInputChange>[0]);
                          setPage(1);
                        }}
                      />
                      <Button kind="ghost" renderIcon={Filter} iconDescription="필터" hasIconOnly tooltipPosition="bottom" />
                      <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly tooltipPosition="bottom" onClick={loadData} />
                      <Button 
                        kind="ghost" 
                        renderIcon={Download} 
                        iconDescription="CSV 다운로드" 
                        hasIconOnly 
                        tooltipPosition="bottom" 
                        onClick={downloadCSV}
                        disabled={filteredUsers.length === 0}
                      />
                      <Button renderIcon={Add} onClick={() => setModal({ mode: 'create' })}>
                        Add User
                      </Button>
                    </TableToolbarContent>
                  </TableToolbar>
                  <Table {...getTableProps()} size="md">
                    <TableHead>
                      <TableRow>
                        <TableSelectAll {...getSelectionProps()} />
                        {headers.map((h) => (
                          <TableHeader
                            key={h.key}
                            {...getHeaderProps({ header: h })}
                          >
                            {h.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={headers.length + 1} style={{ padding: 0 }}>
                            <EmptyState
                              icon={UserMultiple}
                              title="사용자가 없습니다"
                              description="새 사용자를 추가하여 시작하세요."
                              action={
                                <Button
                                  renderIcon={Add}
                                  onClick={() => setModal({ mode: 'create' })}
                                >
                                  Add User
                                </Button>
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableRows.map((row) => {
                          const raw = rows.find((r) => r.id === row.id)?._raw;
                          const rowProps = getRowProps({ row });
                          return (
                            <TableRow
                              {...rowProps}
                              onClick={() => { if (raw) setSelectedUser(raw); }}
                              style={{ cursor: 'pointer' }}
                            >
                              <TableSelectRow {...getSelectionProps({ row })} />
                              {row.cells.map((cell) => {
                                if (cell.info.header === 'status') {
                                  return (
                                    <TableCell key={cell.id}>
                                      <Tag type={cell.value ? 'green' : 'red'}>
                                        {cell.value ? 'Active' : 'Disabled'}
                                      </Tag>
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'groups') {
                                  return (
                                    <TableCell key={cell.id}>
                                      {cell.value > 0 ? (
                                        <Tag type="blue">{cell.value} groups</Tag>
                                      ) : (
                                        <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>
                                      )}
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'org') {
                                  return (
                                    <TableCell key={cell.id}>
                                      {cell.value ? (
                                        <Tag type="teal">{cell.value}</Tag>
                                      ) : (
                                        <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>
                                      )}
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'upn') {
                                  return (
                                    <TableCell key={cell.id} style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.75rem' }}>
                                      {cell.value}
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'actions') {
                                  return (
                                    <TableCell key={cell.id} onClick={(e) => e.stopPropagation()}>
                                      <OverflowMenu flipped>
                                        <OverflowMenuItem itemText="편집" onClick={() => raw && setModal({ mode: 'edit', user: raw })} />
                                        <OverflowMenuItem itemText="비밀번호 변경" onClick={() => raw && setModal({ mode: 'resetPw', user: raw })} />
                                        <OverflowMenuItem itemText={raw?.enabled ? '비활성화' : '활성화'} onClick={() => raw && handleToggleUser(raw)} />
                                        <OverflowMenuItem itemText="삭제" isDelete onClick={() => raw && setModal({ mode: 'delete', user: raw })} />
                                      </OverflowMenu>
                                    </TableCell>
                                  );
                                }
                                return <TableCell key={cell.id}>{cell.value || '—'}</TableCell>;
                              })}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <Pagination
                    totalItems={totalItems}
                    pageSize={pageSize}
                    pageSizes={PAGE_SIZES}
                    page={page}
                    onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
                  />
                </TableContainer>
              )}
            </DataTable>
          </>
        )}
      </div>

      {/* Detail slide panel */}
      {selectedUser && (
        <div style={{
          width: 380,
          flexShrink: 0,
          borderLeft: '1px solid var(--cds-border-subtle)',
          background: 'var(--cds-layer-01)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <UserDetailPanel
            user={selectedUser}
            groups={groups}
            domainLower={domainLower}
            onClose={() => setSelectedUser(null)}
            onEdit={(u) => setModal({ mode: 'edit', user: u })}
            onDelete={(u) => setModal({ mode: 'delete', user: u })}
            onResetPw={(u) => setModal({ mode: 'resetPw', user: u })}
            onRefresh={loadData}
          />
        </div>
      )}

      {/* Modals */}
      <CreateEditModal
        open={modal.mode === 'create' || modal.mode === 'edit'}
        mode={modal.mode === 'edit' ? 'edit' : 'create'}
        user={modal.user}
        groups={groups}
        domainLower={domainLower}
        onClose={() => setModal({ mode: 'none' })}
        onSuccess={loadData}
      />
      <DeleteModal
        open={modal.mode === 'delete'}
        user={modal.user}
        onClose={() => setModal({ mode: 'none' })}
        onSuccess={() => { setSelectedUser(null); loadData(); }}
      />
      <ResetPwModal
        open={modal.mode === 'resetPw'}
        user={modal.user}
        onClose={() => setModal({ mode: 'none' })}
      />
    </div>
  );
}
