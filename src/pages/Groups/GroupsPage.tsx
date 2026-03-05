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
  Button,
  Tag,
  Modal,
  TextInput,
  Select,
  SelectItem,
  Loading,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Pagination,
  FormLabel,
} from '@carbon/react';
import { Add, Renew, Download, TrashCan, UserMultiple } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import {
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  listUsers,
  type Group,
  type User,
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

function isSystem(name: string) { return SYSTEM_GROUPS.has(name); }

function groupTypeTag(name: string, isSystemGroup: boolean) {
  if (isSystemGroup) return <Tag type="gray" size="sm">시스템</Tag>;
  if (name.startsWith('SG-ORG-')) return <Tag type="teal" size="sm">조직</Tag>;
  if (name.startsWith('SG-ROLE-')) return <Tag type="purple" size="sm">역할</Tag>;
  if (name.startsWith('SG-PROJ-')) return <Tag type="cyan" size="sm">프로젝트</Tag>;
  if (name.startsWith('SG-SYS-')) return <Tag type="blue" size="sm">시스템</Tag>;
  if (name.startsWith('ML-')) return <Tag type="magenta" size="sm">메일링</Tag>;
  return <Tag type="teal" size="sm">일반</Tag>;
}

function extractCN(dn: string): string {
  const m = dn.match(/^CN=([^,]+)/i);
  return m ? m[1] : dn;
}

// ─── GroupDetailPanel ─────────────────────────────────────────────────────────

interface DetailPanelProps {
  group: Group;
  users: User[];
  onClose: () => void;
  onEdit: (g: Group) => void;
  onDelete: (g: Group) => void;
  onRefresh: () => void;
}

function GroupDetailPanel({ group, users, onClose, onEdit, onDelete, onRefresh }: DetailPanelProps) {
  const [detail, setDetail] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [addMemberName, setAddMemberName] = useState('');
  const showToast = useAppStore((s) => s.showToast);
  const isSys = isSystem(group.name);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const g = await getGroup(group.name);
      setDetail(g);
    } catch {
      setDetail(group);
    } finally {
      setLoading(false);
    }
  }, [group.name]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const members = (detail?.members || []).map((m) => extractCN(m)).filter(Boolean);

  const handleRemoveMember = async (member: string) => {
    try {
      await removeMember(group.name, member);
      showToast(`'${member}'이(가) 그룹에서 제거됨`, 'success');
      loadDetail();
      onRefresh();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleAddMember = async () => {
    if (!addMemberName) return;
    try {
      await addMember(group.name, addMemberName);
      showToast(`'${addMemberName}'이(가) 그룹에 추가됨`, 'success');
      setAddMemberName('');
      loadDetail();
      onRefresh();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const activeUsers = users.filter((u) => u.username !== 'krbtgt' && u.enabled !== false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{group.name}</span>
        <Button kind="ghost" size="sm" renderIcon={() => <span style={{ fontSize: '1rem' }}>✕</span>} iconDescription="닫기" hasIconOnly onClick={onClose} />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><Loading small description="로딩 중" withOverlay={false} /></div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {/* Group info */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <UserMultiple size={20} />
              {groupTypeTag(group.name, isSys)}
            </div>
            {detail?.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: '0.5rem 0' }}>{detail.description}</p>
            )}
            {detail?.dn && (
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-placeholder)', fontFamily: 'IBM Plex Mono', wordBreak: 'break-all' }}>
                {detail.dn}
              </div>
            )}
          </div>

          {/* Members */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <FormLabel>멤버 ({members.length})</FormLabel>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {members.map((m) => (
                <Tag key={m} type="blue" filter onClose={() => handleRemoveMember(m)}>
                  {m}
                </Tag>
              ))}
              {!members.length && <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>멤버 없음</span>}
            </div>
            {!isSys && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Select
                  id="addMemberSelect"
                  labelText=""
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                  style={{ flex: 1 }}
                  size="sm"
                >
                  <SelectItem value="" text="멤버 선택" />
                  {activeUsers.map((u) => {
                    const display = [u.given_name, u.surname].filter(Boolean).join(' ');
                    return <SelectItem key={u.username} value={u.username} text={display ? `${u.username} (${display})` : u.username} />;
                  })}
                </Select>
                <Button size="sm" kind="secondary" onClick={handleAddMember} disabled={!addMemberName}>추가</Button>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isSys && (
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--cds-border-subtle)', paddingTop: '1rem' }}>
              <Button size="sm" kind="secondary" onClick={() => onEdit(group)}>편집</Button>
              <Button size="sm" kind="danger--ghost" renderIcon={TrashCan} onClick={() => onDelete(group)}>삭제</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CreateEditModal ──────────────────────────────────────────────────────────

const GROUP_TYPES = [
  { value: '', label: '일반 (타입 없음)', prefix: '' },
  { value: 'org', label: '조직 (Organization)', prefix: 'SG-ORG-' },
  { value: 'role', label: '역할 (Role)', prefix: 'SG-ROLE-' },
  { value: 'project', label: '프로젝트 (Project)', prefix: 'SG-PROJ-' },
  { value: 'system', label: '시스템 (System)', prefix: 'SG-SYS-' },
];

interface CreateEditModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  group?: Group;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateEditModal({ open, mode, group, onClose, onSuccess }: CreateEditModalProps) {
  const [groupType, setGroupType] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const showToast = useAppStore((s) => s.showToast);

  const selectedType = GROUP_TYPES.find((t) => t.value === groupType) || GROUP_TYPES[0];
  const preview = name ? `${selectedType.prefix}${name}` : '';

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && group) {
        setName(group.name);
        setDesc(group.description || '');
        setGroupType('');
      } else {
        setGroupType('');
        setName('');
        setDesc('');
      }
      setError('');
    }
  }, [open, mode, group]);

  const handleSubmit = async () => {
    setError('');
    if (!name) { setError('이름을 입력하세요'); return; }
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await createGroup({ name, description: desc || undefined, group_type: groupType || undefined });
        showToast(`'${selectedType.prefix}${name}' 그룹이 생성되었습니다`, 'success');
      } else if (group) {
        const body: { name?: string; description?: string } = {};
        if (name !== group.name) body.name = name;
        if (desc !== (group.description || '')) body.description = desc;
        if (Object.keys(body).length) await updateGroup(group.name, body);
        showToast(`그룹이 수정되었습니다`, 'success');
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
      modalHeading={mode === 'create' ? '그룹 추가' : `그룹 편집 — ${group?.name}`}
      primaryButtonText={mode === 'create' ? '생성' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSubmit}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={submitting}
      size="sm"
    >
      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
      )}
      {mode === 'create' && (
        <Select
          id="groupType"
          labelText="그룹 타입 *"
          value={groupType}
          onChange={(e) => setGroupType(e.target.value)}
          style={{ marginBottom: '1rem' }}
        >
          {GROUP_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value} text={t.label} />
          ))}
        </Select>
      )}
      <div>
        <TextInput
          id="groupName"
          labelText="그룹 이름 *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: DevOps팀"
          helperText={mode === 'create' && preview ? `→ ${preview}` : undefined}
        />
      </div>
      <TextInput
        id="groupDesc"
        labelText="설명"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="선택 사항"
        style={{ marginTop: '1rem' }}
      />
    </Modal>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  open: boolean;
  group?: Group;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteModal({ open, group, onClose, onSuccess }: DeleteModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const showToast = useAppStore((s) => s.showToast);

  const handleDelete = async () => {
    if (!group) return;
    setSubmitting(true);
    try {
      await deleteGroup(group.name);
      showToast(`'${group.name}' 그룹이 삭제되었습니다`, 'success');
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
      modalHeading="그룹 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      onRequestSubmit={handleDelete}
      onRequestClose={onClose}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={submitting}
      size="xs"
    >
      <p>
        <strong>{group?.name}</strong> 그룹을 삭제하시겠습니까?
        <br />이 작업은 되돌릴 수 없습니다.
      </p>
    </Modal>
  );
}

// ─── Main GroupsPage ──────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  { key: 'name', header: '이름' },
  { key: 'type', header: '유형' },
  { key: 'description', header: '설명' },
  { key: 'memberCount', header: '멤버' },
  { key: 'actions', header: '' },
];

const PAGE_SIZES = [20, 50, 100];

type ModalState = { mode: 'none' | 'create' | 'edit' | 'delete'; group?: Group };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterIndex, setFilterIndex] = useState(0); // 0=org, 1=system, 2=all
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: 'none' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const didMount = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gRes, uRes] = await Promise.all([listGroups(), listUsers()]);
      setGroups(gRes.groups || []);
      setUsers((uRes.users || []).filter((u) => u.username !== 'krbtgt'));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; loadData(); }
  }, [loadData]);

  const orgCount = groups.filter((g) => !isSystem(g.name)).length;
  const sysCount = groups.filter((g) => isSystem(g.name)).length;

  const filteredGroups = groups.filter((g) => {
    if (filterIndex === 0) return !isSystem(g.name);
    if (filterIndex === 1) return isSystem(g.name);
    return true;
  });

  const totalItems = filteredGroups.length;
  const start = (page - 1) * pageSize;
  const pageGroups = filteredGroups.slice(start, start + pageSize);

  const rows = pageGroups.map((g) => ({
    id: g.name,
    name: g.name,
    type: g.name,
    description: g.description || '',
    memberCount: g.member_count ?? 0,
    actions: g.name,
    _raw: g,
  }));

  const downloadCSV = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ['Name', 'Type', 'Description', 'Members', 'DN'];
    const csvRows = [headers.map(esc).join(',')];
    for (const g of filteredGroups) {
      csvRows.push([esc(g.name), esc(isSystem(g.name) ? 'System' : 'Organization'), esc(g.description), esc(g.member_count), esc(g.dn)].join(','));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyon-groups-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <PageHeader
          title="그룹 관리"
          description="Active Directory 그룹 관리"
          actions={
            <Button size="sm" renderIcon={Add} onClick={() => setModal({ mode: 'create' })}>Add Group</Button>
          }
        />

        {error && (
          <InlineNotification kind="error" title="로딩 오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loading description="그룹 목록 로딩 중" withOverlay={false} />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '0.5rem' }}>
              <Tabs selectedIndex={filterIndex} onChange={({ selectedIndex }) => { setFilterIndex(selectedIndex as number); setPage(1); }}>
                <TabList aria-label="그룹 필터">
                  <Tab>{`조직 그룹 (${orgCount})`}</Tab>
                  <Tab>{`시스템 그룹 (${sysCount})`}</Tab>
                  <Tab>{`전체 (${groups.length})`}</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel style={{ padding: 0 }} />
                  <TabPanel style={{ padding: 0 }} />
                  <TabPanel style={{ padding: 0 }} />
                </TabPanels>
              </Tabs>
            </div>

            <DataTable rows={rows} headers={TABLE_HEADERS} isSortable>
              {({ rows: tableRows, headers, getHeaderProps, getRowProps, getTableProps, getToolbarProps, onInputChange }) => (
                <TableContainer>
                  <TableToolbar {...getToolbarProps()}>
                    <TableToolbarContent>
                      <TableToolbarSearch
                        placeholder="그룹 검색..."
                        onChange={(e) => { onInputChange(e); setPage(1); }}
                        persistent
                      />
                      <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly tooltipPosition="bottom" onClick={loadData} />
                      <Button kind="ghost" renderIcon={Download} iconDescription="CSV 다운로드" hasIconOnly tooltipPosition="bottom" onClick={downloadCSV} />
                      <Button size="sm" renderIcon={Add} onClick={() => setModal({ mode: 'create' })}>Add Group</Button>
                    </TableToolbarContent>
                  </TableToolbar>
                  <Table {...getTableProps()} size="md">
                    <TableHead>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
                            그룹이 없습니다
                          </TableCell>
                        </TableRow>
                      ) : (
                        tableRows.map((row) => {
                          const raw = rows.find((r) => r.id === row.id)?._raw;
                          const isSys = isSystem(row.id);
                          const rowProps = getRowProps({ row });
                          return (
                            <TableRow
                              {...rowProps}
                              onClick={() => { if (raw) setSelectedGroup(raw); }}
                              style={{ cursor: 'pointer' }}
                            >
                              {row.cells.map((cell) => {
                                if (cell.info.header === 'type') {
                                  return <TableCell key={cell.id}>{groupTypeTag(cell.value as string, isSys)}</TableCell>;
                                }
                                if (cell.info.header === 'memberCount') {
                                  return (
                                    <TableCell key={cell.id}>
                                      {(cell.value as number) > 0 ? (
                                        <Tag type="blue" size="sm">{cell.value}</Tag>
                                      ) : (
                                        <span style={{ color: 'var(--cds-text-placeholder)' }}>0</span>
                                      )}
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'name') {
                                  return <TableCell key={cell.id}><strong>{cell.value as string}</strong></TableCell>;
                                }
                                if (cell.info.header === 'description') {
                                  return (
                                    <TableCell key={cell.id} style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>
                                      {(cell.value as string) || '—'}
                                    </TableCell>
                                  );
                                }
                                if (cell.info.header === 'actions') {
                                  return (
                                    <TableCell key={cell.id} onClick={(e) => e.stopPropagation()}>
                                      <OverflowMenu size="sm" flipped>
                                        <OverflowMenuItem itemText="멤버 관리" onClick={() => raw && setSelectedGroup(raw)} />
                                        {!isSys && <OverflowMenuItem itemText="편집" onClick={() => raw && setModal({ mode: 'edit', group: raw })} />}
                                        {!isSys && <OverflowMenuItem itemText="삭제" isDelete onClick={() => raw && setModal({ mode: 'delete', group: raw })} />}
                                      </OverflowMenu>
                                    </TableCell>
                                  );
                                }
                                return <TableCell key={cell.id}>{cell.value as string || '—'}</TableCell>;
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

      {/* Detail panel */}
      {selectedGroup && (
        <div style={{ width: 360, flexShrink: 0, borderLeft: '1px solid var(--cds-border-subtle)', background: 'var(--cds-layer-01)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <GroupDetailPanel
            group={selectedGroup}
            users={users}
            onClose={() => setSelectedGroup(null)}
            onEdit={(g) => setModal({ mode: 'edit', group: g })}
            onDelete={(g) => setModal({ mode: 'delete', group: g })}
            onRefresh={loadData}
          />
        </div>
      )}

      <CreateEditModal
        open={modal.mode === 'create' || modal.mode === 'edit'}
        mode={modal.mode === 'edit' ? 'edit' : 'create'}
        group={modal.group}
        onClose={() => setModal({ mode: 'none' })}
        onSuccess={loadData}
      />
      <DeleteModal
        open={modal.mode === 'delete'}
        group={modal.group}
        onClose={() => setModal({ mode: 'none' })}
        onSuccess={() => { setSelectedGroup(null); loadData(); }}
      />
    </div>
  );
}
