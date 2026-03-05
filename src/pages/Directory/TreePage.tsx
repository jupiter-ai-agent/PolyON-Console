import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  TextInput,
  Loading,
  InlineNotification,
  Tag,
  Select,
  SelectItem,
  Modal,
} from '@carbon/react';
import {
  Renew,
  UserAvatar,
  UserMultiple,
  Globe,
  Enterprise,
  FolderOpen,
  Laptop,
  ServerDns,
  ChevronRight,
  ChevronDown,
  Add,
  TrashCan,
  Move,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import {
  listUsers,
  listGroups,
  listOUs,
  domainDCs,
  listComputers,
  getUser,
  getGroup,
  updateUser,
  enableUser,
  disableUser,
  resetPassword,
  addMember,
  removeMember,
  moveUser,
  moveGroup,
  createOU,
  deleteOU,
  userPhotoUrl,
  type User,
  type Group,
  type OU,
  type Computer,
} from '../../api/users';
import { useAppStore } from '../../store/useAppStore';

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

type DetailType = 'domain' | 'user' | 'group' | 'ou' | 'computer' | 'dc' | null;

interface DetailState {
  type: DetailType;
  name: string;
  data?: User | Group | Computer | OU | null;
}

type TreeNodeKey = string;

function extractCN(dn: string) {
  const m = dn.match(/^CN=([^,]+)/i);
  return m ? m[1] : dn;
}

function groupTypeColor(name: string): 'blue' | 'purple' | 'green' | 'teal' | 'gray' {
  if (name.startsWith('SG-ORG-')) return 'blue';
  if (name.startsWith('SG-ROLE-')) return 'purple';
  if (name.startsWith('SG-PROJ-')) return 'green';
  if (name.startsWith('SG-SYS-')) return 'teal';
  return 'gray';
}

function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default function TreePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [ous, setOUs] = useState<OU[]>([]);
  const [dcs, setDCs] = useState<Computer[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [expanded, setExpanded] = useState<Set<TreeNodeKey>>(new Set(['domain', 'Users', 'Groups', 'Domain Controllers', 'Computers']));
  const [detail, setDetail] = useState<DetailState>({ type: null, name: '' });
  const [detailLoading, setDetailLoading] = useState(false);

  // User edit state
  const [editGiven, setEditGiven] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editMail, setEditMail] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Modals
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingUser, setMovingUser] = useState('');
  const [movingGroup, setMovingGroup] = useState('');
  const [moveTarget, setMoveTarget] = useState('');
  const [createOUOpen, setCreateOUOpen] = useState(false);
  const [createOUParent, setCreateOUParent] = useState('');
  const [ouName, setOuName] = useState('');
  const [ouDesc, setOuDesc] = useState('');
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');

  const showToast = useAppStore((s) => s.showToast);
  const domainLower = useAppStore((s) => s.domainInfo.realmLower) || 'example.com';
  const baseDN = useAppStore((s) => s.domainInfo.base_dn) || `DC=${domainLower.split('.').join(',DC=')}`;
  const didMount = useRef(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, gRes, oRes, dcRes, cRes] = await Promise.all([
        listUsers().catch(() => ({ users: [] })),
        listGroups().catch(() => ({ groups: [] })),
        listOUs().catch(() => ({ ous: [] })),
        domainDCs().catch(() => ({ dcs: [] })),
        listComputers().catch(() => ({ computers: [] })),
      ]);
      setUsers((uRes.users || []).filter((u) => u.username !== 'krbtgt'));
      setGroups(gRes.groups || []);
      setOUs(oRes.ous || []);
      setDCs(dcRes.dcs || []);
      setComputers((cRes.computers || []).filter((c) => !(c.dn || '').toLowerCase().includes('ou=domain controllers')));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; loadAll(); }
  }, [loadAll]);

  // ─── Tree helpers ───

  const toggleExpand = (key: TreeNodeKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const q = searchQ.toLowerCase();

  // ─── Tree rendering ───

  const renderLeaf = (icon: React.ReactNode, label: string, onClick: () => void, style?: React.CSSProperties, isSelected?: boolean) => (
    <div
      style={{
        display: 'flex', alignItems: 'center', padding: '4px 8px',
        cursor: 'pointer', fontSize: '0.8125rem',
        background: isSelected ? 'var(--cds-layer-selected-01)' : 'transparent',
        ...style,
      }}
      onClick={onClick}
    >
      <span style={{ width: 20, flexShrink: 0 }} />
      <span style={{ flexShrink: 0, marginRight: 6, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );

  const renderBranch = (key: string, icon: React.ReactNode, label: string, children: React.ReactNode, depth = 0) => {
    const isExp = expanded.has(key);
    const pad = 8 + depth * 16;
    return (
      <div key={key}>
        <div
          style={{ display: 'flex', alignItems: 'center', padding: `4px 8px 4px ${pad}px`, cursor: 'pointer', fontSize: '0.8125rem', userSelect: 'none' }}
          onClick={() => toggleExpand(key)}
        >
          <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 4 }}>
            {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
          <span style={{ flexShrink: 0, marginRight: 6, display: 'flex', alignItems: 'center' }}>{icon}</span>
          <strong>{label}</strong>
        </div>
        {isExp && <div style={{ paddingLeft: depth * 16 }}>{children}</div>}
      </div>
    );
  };

  // OU branch builder
  const ousByParent: Record<string, OU[]> = {};
  ous.filter((o) => o.name !== 'Domain Controllers').forEach((o) => {
    const parent = o.parent_dn || baseDN;
    if (!ousByParent[parent]) ousByParent[parent] = [];
    ousByParent[parent].push(o);
  });

  const renderOUBranch = (parentDn: string, depth: number): React.ReactNode => {
    const children = (ousByParent[parentDn] || []).sort((a, b) => a.name.localeCompare(b.name));
    if (!children.length) return null;
    return children.map((ou) => {
      const key = `ou:${ou.dn}`;
      const subChildren = renderOUBranch(ou.dn, depth + 1);
      const ouUsers = users.filter((u) => {
        const uParent = (u.dn || '').split(',').slice(1).join(',');
        return uParent === ou.dn && (!q || u.username.toLowerCase().includes(q) || (u.given_name || '').toLowerCase().includes(q));
      });
      const ouGroups = groups.filter((g) => {
        const gParent = (g.dn || '').split(',').slice(1).join(',');
        return gParent === ou.dn && (!q || g.name.toLowerCase().includes(q));
      });

      const ouMatch = !q || ou.name.toLowerCase().includes(q);

      if (!subChildren && !ouUsers.length && !ouGroups.length && !ouMatch) return null;

      const hasContent = !!subChildren || ouUsers.length > 0 || ouGroups.length > 0;
      const pad = 8 + depth * 16;

      if (!hasContent) {
        return renderLeaf(
          <Enterprise size={14} />,
          ou.name,
          () => setDetail({ type: 'ou', name: ou.name, data: ou }),
          { paddingLeft: pad + 20 },
          detail.type === 'ou' && detail.name === ou.name,
        );
      }

      const isExp = expanded.has(key);
      return (
        <div key={key}>
          <div
            style={{ display: 'flex', alignItems: 'center', padding: `4px 8px 4px ${pad}px`, cursor: 'pointer', fontSize: '0.8125rem', background: detail.type === 'ou' && detail.name === ou.name ? 'var(--cds-layer-selected-01)' : 'transparent' }}
            onClick={() => { toggleExpand(key); setDetail({ type: 'ou', name: ou.name, data: ou }); }}
          >
            <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 4 }} onClick={(e) => { e.stopPropagation(); toggleExpand(key); }}>
              {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            <Enterprise size={14} style={{ marginRight: 6 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ou.name}</span>
          </div>
          {isExp && (
            <div>
              {subChildren}
              {ouUsers.map((u) => {
                const display = [u.given_name, u.surname].filter(Boolean).join(' ');
                const label = display ? `${u.username} (${display})` : u.username;
                return renderLeaf(
                  <UserAvatar size={14} />,
                  label,
                  () => selectUser(u.username),
                  { paddingLeft: (depth + 1) * 16 + 8, color: u.enabled ? undefined : 'var(--cds-text-disabled)', textDecoration: u.enabled ? undefined : 'line-through' },
                  detail.type === 'user' && detail.name === u.username,
                );
              })}
              {ouGroups.map((g) => renderLeaf(
                <UserMultiple size={14} />,
                g.name,
                () => selectGroup(g.name),
                { paddingLeft: (depth + 1) * 16 + 8 },
                detail.type === 'group' && detail.name === g.name,
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // CN=Users container users
  const baseUsers = users.filter((u) => {
    const parent = (u.dn || '').split(',').slice(1).join(',');
    return parent === `CN=Users,${baseDN}` && (!q || u.username.toLowerCase().includes(q) || (u.given_name || '').toLowerCase().includes(q));
  });

  // Groups by SG type
  const sgOrg = groups.filter((g) => g.name.startsWith('SG-ORG-') && (!q || g.name.toLowerCase().includes(q)));
  const sgRole = groups.filter((g) => g.name.startsWith('SG-ROLE-') && (!q || g.name.toLowerCase().includes(q)));
  const sgProj = groups.filter((g) => g.name.startsWith('SG-PROJ-') && (!q || g.name.toLowerCase().includes(q)));
  const sgSys = groups.filter((g) => g.name.startsWith('SG-SYS-') && (!q || g.name.toLowerCase().includes(q)));
  const customGroups = groups.filter((g) => !SYSTEM_GROUPS.has(g.name) && !g.name.startsWith('SG-') && (!q || g.name.toLowerCase().includes(q)));
  const systemGroups = groups.filter((g) => SYSTEM_GROUPS.has(g.name) && (!q || g.name.toLowerCase().includes(q)));
  const filteredComps = computers.filter((c) => !q || (c.name || '').toLowerCase().includes(q));
  const filteredDCs = dcs.filter((d) => !q || (d.name || '').toLowerCase().includes(q));

  // ─── Select handlers ───

  const selectUser = async (username: string) => {
    setDetail({ type: 'user', name: username, data: null });
    setDetailLoading(true);
    try {
      const u = await getUser(username);
      setDetail({ type: 'user', name: username, data: u });
      setEditGiven(u.given_name || '');
      setEditSurname(u.surname || '');
      setEditMail(u.mail || '');
      setEditDesc(u.description || '');
    } catch {
      setDetailLoading(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectGroup = async (name: string) => {
    setDetail({ type: 'group', name, data: null });
    setDetailLoading(true);
    try {
      const g = await getGroup(name);
      setDetail({ type: 'group', name, data: g });
    } catch {
      setDetailLoading(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Detail panel content ───

  const detailUser = detail.type === 'user' ? (detail.data as User) : null;
  const detailGroup = detail.type === 'group' ? (detail.data as Group) : null;
  const detailOU = detail.type === 'ou' ? (detail.data as OU) : null;
  const detailComp = detail.type === 'computer' ? (detail.data as Computer) : null;
  const detailDC = detail.type === 'dc' ? (detail.data as Computer) : null;

  const handleSaveUser = async () => {
    if (!detailUser) return;
    try {
      await updateUser(detailUser.username, { given_name: editGiven || undefined, surname: editSurname || undefined, mail: editMail || undefined, description: editDesc || undefined });
      showToast('저장 완료', 'success');
      await loadAll();
      selectUser(detailUser.username);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleToggleUser = async () => {
    if (!detailUser) return;
    try {
      if (detailUser.enabled) await disableUser(detailUser.username);
      else await enableUser(detailUser.username);
      showToast(`'${detailUser.username}' ${detailUser.enabled ? '비활성화' : '활성화'} 완료`, 'success');
      await loadAll();
      selectUser(detailUser.username);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleRemoveMember = async (group: string, member: string) => {
    try {
      await removeMember(group, member);
      showToast(`'${member}' 제거`, 'success');
      selectGroup(group);
      await loadAll();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleAddMember = async (group: string, member: string) => {
    try {
      await addMember(group, member);
      showToast(`'${member}' 추가`, 'success');
      selectGroup(group);
      await loadAll();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleResetPw = async () => {
    if (!detailUser || !newPw) return;
    try {
      await resetPassword(detailUser.username, newPw);
      showToast('비밀번호 변경 완료', 'success');
      setResetPwOpen(false);
      setNewPw('');
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleMoveUser = async () => {
    if (!movingUser || !moveTarget) return;
    try {
      await moveUser(movingUser, moveTarget);
      showToast(`'${movingUser}' 이동 완료`, 'success');
      setMoveModalOpen(false);
      await loadAll();
      selectUser(movingUser);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleMoveGroup = async () => {
    if (!movingGroup || !moveTarget) return;
    try {
      await moveGroup(movingGroup, moveTarget);
      showToast(`'${movingGroup}' 이동 완료`, 'success');
      setMoveModalOpen(false);
      await loadAll();
      selectGroup(movingGroup);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleCreateOU = async () => {
    if (!ouName) { showToast('이름 필수', 'error'); return; }
    try {
      await createOU({ name: ouName, parent_dn: createOUParent || undefined, description: ouDesc || undefined });
      showToast(`OU '${ouName}' 생성`, 'success');
      setCreateOUOpen(false);
      setOuName(''); setOuDesc('');
      await loadAll();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDeleteOU = async (dn: string, name: string) => {
    if (!confirm(`'${name}' OU를 삭제하시겠습니까?`)) return;
    try {
      await deleteOU(dn);
      showToast(`'${name}' 삭제`, 'success');
      setDetail({ type: null, name: '' });
      await loadAll();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const ouOptions = [
    { dn: `CN=Users,${baseDN}`, name: 'CN=Users (기본)' },
    ...ous.map((o) => ({ dn: o.dn, name: o.name })),
  ];

  // User groups
  const userGroups = detailUser?.groups || (detailUser?.member_of || []).map(extractCN).filter(Boolean);
  const sgOrgG = userGroups.filter((g) => g.startsWith('SG-ORG-'));
  const sgRoleG = userGroups.filter((g) => g.startsWith('SG-ROLE-'));
  const sgProjG = userGroups.filter((g) => g.startsWith('SG-PROJ-'));
  const sgSysG = userGroups.filter((g) => g.startsWith('SG-SYS-'));
  const otherG = userGroups.filter((g) => !g.startsWith('SG-') && g !== 'Domain Users');

  // Group members
  const groupMembers = (detailGroup?.members || []).map(extractCN).filter(Boolean);

  // Add member state
  const [addMemberVal, setAddMemberVal] = useState('');

  return (
    <>
      <PageHeader
        title="Users and Computers"
        description="Active Directory 디렉터리 트리 — 직접 편집 가능"
        actions={
          <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly onClick={loadAll} />
        }
      />

      {error && (
        <InlineNotification kind="error" title="로딩 오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loading description="디렉터리 로딩 중" withOverlay={false} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', border: '1px solid var(--cds-border-subtle)', minHeight: 600 }}>
          {/* Tree panel */}
          <div style={{ borderRight: '1px solid var(--cds-border-subtle)', overflowY: 'auto' }}>
            <div style={{ padding: '8px', borderBottom: '1px solid var(--cds-border-subtle)' }}>
              <TextInput
                id="treeSearch"
                labelText=""
                placeholder="Search..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                size="sm"
              />
            </div>
            <div>
              {/* Domain root */}
              {renderBranch('domain', <Globe size={14} />, domainLower, (
                <>
                  {/* Computers branch */}
                  {renderBranch('Computers', <FolderOpen size={14} />, `Computers (${filteredComps.length})`,
                    filteredComps.map((c) => renderLeaf(
                      <Laptop size={14} />,
                      c.name || '—',
                      () => setDetail({ type: 'computer', name: c.name || '', data: c }),
                      { paddingLeft: 36 },
                      detail.type === 'computer' && detail.name === c.name,
                    )), 1
                  )}

                  {/* Groups branch */}
                  {renderBranch('Groups', <FolderOpen size={14} />, `Groups (${groups.length})`, (
                    <>
                      {sgOrg.length > 0 && renderBranch('01_Org', <Enterprise size={14} />, `01_Org (${sgOrg.length})`, sgOrg.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 52 }, detail.type === 'group' && detail.name === g.name)), 2)}
                      {sgRole.length > 0 && renderBranch('02_Role', <Enterprise size={14} />, `02_Role (${sgRole.length})`, sgRole.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 52 }, detail.type === 'group' && detail.name === g.name)), 2)}
                      {sgProj.length > 0 && renderBranch('03_Project', <Enterprise size={14} />, `03_Project (${sgProj.length})`, sgProj.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 52 }, detail.type === 'group' && detail.name === g.name)), 2)}
                      {sgSys.length > 0 && renderBranch('04_System', <Enterprise size={14} />, `04_System (${sgSys.length})`, sgSys.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 52 }, detail.type === 'group' && detail.name === g.name)), 2)}
                      {customGroups.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 36 }, detail.type === 'group' && detail.name === g.name))}
                      {systemGroups.length > 0 && renderBranch('System', <FolderOpen size={14} />, `System (${systemGroups.length})`, systemGroups.map((g) => renderLeaf(<UserMultiple size={14} />, g.name, () => selectGroup(g.name), { paddingLeft: 52, color: 'var(--cds-text-secondary)' }, detail.type === 'group' && detail.name === g.name)), 2)}
                    </>
                  ), 1)}

                  {/* OUs */}
                  {renderOUBranch(baseDN, 1)}

                  {/* CN=Users */}
                  {renderBranch('Users', <FolderOpen size={14} />, `Users (${baseUsers.length})`, baseUsers.map((u) => {
                    const display = [u.given_name, u.surname].filter(Boolean).join(' ');
                    const label = display ? `${u.username} (${display})` : u.username;
                    return renderLeaf(<UserAvatar size={14} />, label, () => selectUser(u.username), { paddingLeft: 36, color: u.enabled ? undefined : 'var(--cds-text-disabled)', textDecoration: u.enabled ? undefined : 'line-through' }, detail.type === 'user' && detail.name === u.username);
                  }), 1)}

                  {/* Domain Controllers */}
                  {renderBranch('Domain Controllers', <FolderOpen size={14} />, `Domain Controllers (${filteredDCs.length})`, filteredDCs.map((d) => renderLeaf(<ServerDns size={14} />, d.name || '—', () => setDetail({ type: 'dc', name: d.name || '', data: d }), { paddingLeft: 36 }, detail.type === 'dc' && detail.name === d.name)), 1)}
                </>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ overflowY: 'auto', padding: '1rem' }}>
            {detail.type === null && (
              <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--cds-text-placeholder)' }}>
                <Globe size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>좌측 트리에서 항목을 선택하세요</p>
              </div>
            )}

            {/* Domain info */}
            {detail.type === 'domain' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                  <Globe size={20} />
                  <strong style={{ fontSize: '1rem' }}>{domainLower}</strong>
                </div>
                {[
                  { label: 'Users', value: users.length },
                  { label: 'Groups', value: groups.length },
                  { label: 'OUs', value: ous.length },
                  { label: 'Computers', value: computers.length },
                  { label: 'Base DN', value: baseDN },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.5rem', padding: '5px 0', fontSize: '0.8125rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <span style={{ width: 100, flexShrink: 0, color: 'var(--cds-text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: typeof value === 'string' ? 'IBM Plex Mono' : undefined, fontSize: typeof value === 'string' ? '0.75rem' : undefined }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16 }}>
                  <Button size="sm" kind="ghost" renderIcon={Add} onClick={() => { setCreateOUParent(baseDN); setCreateOUOpen(true); }}>
                    OU 추가
                  </Button>
                </div>
              </>
            )}

            {/* User detail */}
            {detail.type === 'user' && (
              <>
                {detailLoading ? (
                  <Loading small description="로딩 중" withOverlay={false} />
                ) : detailUser ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <UserAvatar size={20} />
                      <strong style={{ fontSize: '1rem' }}>{detail.name}</strong>
                      <Tag type={detailUser.enabled ? 'green' : 'red'} size="sm">{detailUser.enabled ? 'Active' : 'Disabled'}</Tag>
                    </div>

                    {/* Profile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <div style={{ width: 64, height: 64, overflow: 'hidden', background: 'var(--cds-layer-02)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--cds-border-subtle)', flexShrink: 0 }}>
                        <img src={userPhotoUrl(detailUser.username)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <UserAvatar size={32} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{detailUser.display_name || detailUser.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontFamily: 'IBM Plex Mono' }}>{detailUser.mail || `${detailUser.username}@${domainLower}`}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-placeholder)', fontFamily: 'IBM Plex Mono', wordBreak: 'break-all' }}>{detailUser.dn}</div>
                      </div>
                    </div>

                    {/* Editable fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <TextInput id="tvGiven" labelText="Given Name" value={editGiven} onChange={(e) => setEditGiven(e.target.value)} size="sm" />
                      <TextInput id="tvSurname" labelText="Surname" value={editSurname} onChange={(e) => setEditSurname(e.target.value)} size="sm" />
                    </div>
                    <TextInput id="tvMail" labelText="외부 메일" value={editMail} onChange={(e) => setEditMail(e.target.value)} size="sm" style={{ marginBottom: '0.5rem' }} />
                    <TextInput id="tvDesc" labelText="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} size="sm" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                      <Button size="sm" onClick={handleSaveUser}>저장</Button>
                      <Button size="sm" kind="ghost" renderIcon={Move} onClick={() => { setMovingUser(detailUser.username); setMovingGroup(''); setMoveTarget(''); setMoveModalOpen(true); }}>OU 이동</Button>
                      <Button size="sm" kind="ghost" onClick={() => { setNewPw(generatePassword()); setResetPwOpen(true); }}>비밀번호 변경</Button>
                      <Button size="sm" kind={detailUser.enabled ? 'danger--ghost' : 'ghost'} onClick={handleToggleUser}>
                        {detailUser.enabled ? '비활성화' : '활성화'}
                      </Button>
                    </div>

                    {/* Groups */}
                    <div style={{ borderTop: '1px solid var(--cds-border-subtle)', paddingTop: 12 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 8 }}>소속 그룹</div>
                      {[
                        { list: sgOrgG, label: '조직', color: 'blue' },
                        { list: sgRoleG, label: '역할', color: 'purple' },
                        { list: sgProjG, label: '프로젝트', color: 'green' },
                        { list: sgSysG, label: '시스템', color: 'teal' },
                        { list: otherG, label: '기타', color: 'gray' },
                      ].filter(({ list }) => list.length > 0).map(({ list, label, color }) => (
                        <div key={label} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: 4 }}>{label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {list.map((g) => (
                              <Tag key={g} type={color as 'blue' | 'purple' | 'green' | 'teal' | 'gray'} size="sm" style={{ cursor: 'pointer' }} onClick={() => selectGroup(g)}>
                                {g}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      ))}
                      {!userGroups.length && <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>없음</span>}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--cds-text-secondary)' }}>로딩 실패</div>
                )}
              </>
            )}

            {/* Group detail */}
            {detail.type === 'group' && (
              <>
                {detailLoading ? (
                  <Loading small description="로딩 중" withOverlay={false} />
                ) : detailGroup ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <UserMultiple size={20} />
                      <strong style={{ fontSize: '1rem' }}>{detail.name}</strong>
                      <Tag type={groupTypeColor(detail.name)} size="sm">
                        {detail.name.startsWith('SG-ORG-') ? '조직' : detail.name.startsWith('SG-ROLE-') ? '역할' : detail.name.startsWith('SG-PROJ-') ? '프로젝트' : detail.name.startsWith('SG-SYS-') ? '시스템' : '기타'}
                      </Tag>
                    </div>
                    {detailGroup.description && <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: 8 }}>{detailGroup.description}</p>}
                    <p style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--cds-text-placeholder)', wordBreak: 'break-all', marginBottom: '1rem' }}>{detailGroup.dn}</p>

                    {/* Members */}
                    <div style={{ borderTop: '1px solid var(--cds-border-subtle)', paddingTop: 12, marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>멤버 ({groupMembers.length})</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
                        {groupMembers.map((m) => (
                          <Tag key={m} type="blue" size="sm" filter onClose={() => handleRemoveMember(detail.name, m)}>
                            {m}
                          </Tag>
                        ))}
                        {!groupMembers.length && <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>멤버 없음</span>}
                      </div>

                      {/* Add member */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Select id="addMember" labelText="" value={addMemberVal} onChange={(e) => setAddMemberVal(e.target.value)} size="sm" style={{ flex: 1 }}>
                          <SelectItem value="" text="멤버 추가" />
                          <optgroup label="사용자">
                            {users.filter((u) => u.username !== 'krbtgt').map((u) => {
                              const display = [u.given_name, u.surname].filter(Boolean).join(' ');
                              return <SelectItem key={u.username} value={u.username} text={display ? `${u.username} (${display})` : u.username} />;
                            })}
                          </optgroup>
                          <optgroup label="그룹">
                            {groups.filter((g) => g.name.startsWith('SG-')).map((g) => (
                              <SelectItem key={g.name} value={g.name} text={g.name} />
                            ))}
                          </optgroup>
                        </Select>
                        <Button size="sm" kind="secondary" disabled={!addMemberVal} onClick={() => { if (addMemberVal) { handleAddMember(detail.name, addMemberVal); setAddMemberVal(''); } }}>추가</Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" kind="ghost" renderIcon={Move} onClick={() => { setMovingGroup(detail.name); setMovingUser(''); setMoveTarget(''); setMoveModalOpen(true); }}>OU 이동</Button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--cds-text-secondary)' }}>로딩 실패</div>
                )}
              </>
            )}

            {/* OU detail */}
            {detail.type === 'ou' && detailOU && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                  <Enterprise size={20} />
                  <strong style={{ fontSize: '1rem' }}>{detail.name}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--cds-text-placeholder)', wordBreak: 'break-all', marginBottom: '1rem' }}>{detailOU.dn}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" kind="ghost" renderIcon={Add} onClick={() => { setCreateOUParent(detailOU.dn); setCreateOUOpen(true); }}>하위 OU 추가</Button>
                  <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={() => handleDeleteOU(detailOU.dn, detailOU.name)}>삭제</Button>
                </div>
              </>
            )}

            {/* Computer detail */}
            {detail.type === 'computer' && detailComp && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                  <Laptop size={20} />
                  <strong style={{ fontSize: '1rem' }}>{detail.name}</strong>
                </div>
                {[
                  { label: 'Name', value: detailComp.name || '—' },
                  { label: 'Hostname', value: detailComp.dns_hostname || '—', mono: true },
                  { label: 'OS', value: detailComp.os || '—' },
                  { label: 'DN', value: detailComp.dn || '—', mono: true, small: true },
                ].map(({ label, value, mono, small }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.5rem', padding: '5px 0', fontSize: small ? '0.75rem' : '0.8125rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <span style={{ width: 80, flexShrink: 0, color: 'var(--cds-text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: mono ? 'IBM Plex Mono' : undefined, wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
              </>
            )}

            {/* DC detail */}
            {detail.type === 'dc' && detailDC && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                  <ServerDns size={20} />
                  <strong style={{ fontSize: '1rem' }}>{detail.name}</strong>
                  <Tag type="green" size="sm">Online</Tag>
                </div>
                {[
                  { label: 'Name', value: detailDC.name || '—' },
                  { label: 'Hostname', value: detailDC.dns_hostname || '—', mono: true },
                  { label: 'DN', value: detailDC.dn || '—', mono: true, small: true },
                ].map(({ label, value, mono, small }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.5rem', padding: '5px 0', fontSize: small ? '0.75rem' : '0.8125rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                    <span style={{ width: 80, flexShrink: 0, color: 'var(--cds-text-secondary)' }}>{label}</span>
                    <span style={{ fontFamily: mono ? 'IBM Plex Mono' : undefined, wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        open={moveModalOpen}
        modalHeading={movingUser ? `사용자 이동 — ${movingUser}` : `그룹 이동 — ${movingGroup}`}
        primaryButtonText="이동"
        secondaryButtonText="취소"
        onRequestSubmit={movingUser ? handleMoveUser : handleMoveGroup}
        onRequestClose={() => setMoveModalOpen(false)}
        onSecondarySubmit={() => setMoveModalOpen(false)}
        size="xs"
      >
        <Select id="moveTarget" labelText="이동할 OU 선택" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
          <SelectItem value="" text="선택하세요" />
          {ouOptions.map((o) => <SelectItem key={o.dn} value={o.dn} text={o.name} />)}
        </Select>
      </Modal>

      <Modal
        open={createOUOpen}
        modalHeading="하위 OU 추가"
        primaryButtonText="생성"
        secondaryButtonText="취소"
        onRequestSubmit={handleCreateOU}
        onRequestClose={() => setCreateOUOpen(false)}
        onSecondarySubmit={() => setCreateOUOpen(false)}
        size="xs"
      >
        <TextInput id="ouName" labelText="이름 *" value={ouName} onChange={(e) => setOuName(e.target.value)} placeholder="예: IT사업부" />
        <TextInput id="ouDesc" labelText="설명" value={ouDesc} onChange={(e) => setOuDesc(e.target.value)} style={{ marginTop: '1rem' }} />
      </Modal>

      <Modal
        open={resetPwOpen}
        modalHeading={`비밀번호 변경 — ${detail.name}`}
        primaryButtonText="변경"
        secondaryButtonText="취소"
        onRequestSubmit={handleResetPw}
        onRequestClose={() => setResetPwOpen(false)}
        onSecondarySubmit={() => setResetPwOpen(false)}
        size="xs"
      >
        <TextInput id="newPw" labelText="새 비밀번호" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
      </Modal>
    </>
  );
}
