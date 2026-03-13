import { useState, useEffect, useCallback } from 'react';
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
  Checkbox,
  Loading,
  InlineNotification,
  Pagination,
} from '@carbon/react';
import { Renew, UserMultiple, View } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { apiFetch } from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OdooUser {
  id: number;
  name: string;
  login: string;
  email: string | false | null;
  active: boolean;
  groups_id: number[];
}

interface OdooGroup {
  id: number;
  name: string;
  full_name: string | [number, string] | false | null;
  category_id: [number, string] | false | null;
}

interface ListUsersResponse {
  success: boolean;
  users: OdooUser[];
  count: number;
}

interface GetUserResponse {
  success: boolean;
  user: OdooUser;
  groups: OdooGroup[];
}

interface ListGroupsResponse {
  success: boolean;
  groups: OdooGroup[];
  count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFullName(g: OdooGroup): string {
  if (typeof g.full_name === 'string' && g.full_name) return g.full_name;
  if (Array.isArray(g.full_name) && g.full_name[1]) return g.full_name[1];
  return g.name;
}

function getCategoryName(g: OdooGroup): string {
  if (Array.isArray(g.category_id) && g.category_id[1]) return g.category_id[1] as string;
  return '기타';
}

function getEmail(user: OdooUser): string {
  if (typeof user.email === 'string') return user.email;
  return '';
}

// ── Component ──────────────────────────────────────────────────────────────────

const PAGE_SIZES = [20, 50, 100];

export default function AppEngineUsersPage() {
  const [users, setUsers] = useState<OdooUser[]>([]);
  const [allGroups, setAllGroups] = useState<OdooGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedUser, setSelectedUser] = useState<OdooUser | null>(null);
  const [userGroups, setUserGroups] = useState<OdooGroup[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Group edit state
  const [editingGroups, setEditingGroups] = useState(false);
  const [selectedGroupIDs, setSelectedGroupIDs] = useState<Set<number>>(new Set());
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [groupFilter, setGroupFilter] = useState('');

  // ── Load users ───────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ListUsersResponse>('/appengine/users');
      setUsers(res.users || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllGroups = useCallback(async () => {
    try {
      const res = await apiFetch<ListGroupsResponse>('/appengine/groups');
      setAllGroups(res.groups || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadAllGroups();
  }, [loadUsers, loadAllGroups]);

  // ── Open user detail ─────────────────────────────────────────────────────────

  const openUser = async (user: OdooUser) => {
    if (!user.id) {
      setInfoMessage('Odoo에 아직 등록되지 않은 사용자입니다.');
      setTimeout(() => setInfoMessage(null), 4000);
      return;
    }
    setSelectedUser(user);
    setModalOpen(true);
    setEditingGroups(false);
    setSaveSuccess(false);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch<GetUserResponse>(`/appengine/users/${user.id}`);
      setUserGroups(res.groups || []);
      setSelectedGroupIDs(new Set((res.groups || []).map((g) => g.id)));
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setUserGroups([]);
    setEditingGroups(false);
    setSaveSuccess(false);
    setGroupFilter('');
  };

  // ── Save group changes ───────────────────────────────────────────────────────

  const saveGroups = async () => {
    if (!selectedUser) return;
    setSaveLoading(true);
    setDetailError(null);
    try {
      await apiFetch(`/appengine/users/${selectedUser.id}/groups`, {
        method: 'PUT',
        body: JSON.stringify({ group_ids: Array.from(selectedGroupIDs) }),
      });
      setSaveSuccess(true);
      setEditingGroups(false);
      // Refresh group display
      const res = await apiFetch<GetUserResponse>(`/appengine/users/${selectedUser.id}`);
      setUserGroups(res.groups || []);
      setSelectedGroupIDs(new Set((res.groups || []).map((g) => g.id)));
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Filter + paginate ────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) ||
      getEmail(u).toLowerCase().includes(q)
    );
  });

  const totalItems = filtered.length;
  const pageStart = (page - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  // ── DataTable rows ────────────────────────────────────────────────────────────

  const headers = [
    { key: 'name', header: '이름' },
    { key: 'login', header: '로그인' },
    { key: 'email', header: '이메일' },
    { key: 'active', header: '상태' },
    { key: 'groups', header: '그룹 수' },
    { key: 'actions', header: '' },
  ];

  const rows = paged.map((u) => ({
    id: String(u.id),
    name: u.name,
    login: u.login,
    email: getEmail(u),
    active: u.active,
    groups: Array.isArray(u.groups_id) ? u.groups_id.length : 0,
    _user: u,
  }));

  // ── Group categories for display ─────────────────────────────────────────────

  const filteredAllGroups = allGroups.filter((g) => {
    if (!groupFilter) return true;
    const q = groupFilter.toLowerCase();
    return (
      getFullName(g).toLowerCase().includes(q) ||
      getCategoryName(g).toLowerCase().includes(q)
    );
  });

  const groupsByCategory = filteredAllGroups.reduce<Record<string, OdooGroup[]>>((acc, g) => {
    const cat = getCategoryName(g);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(g);
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      <PageHeader
        title="사용자/권한 관리"
        description="AppEngine (Odoo) 내부 사용자 및 그룹 권한을 관리합니다."
      />

      {error && (
        <InlineNotification
          kind="error"
          title="오류"
          subtitle={error}
          hideCloseButton={false}
          onCloseButtonClick={() => setError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {infoMessage && (
        <InlineNotification
          kind="info"
          title="안내"
          subtitle={infoMessage}
          hideCloseButton={false}
          onCloseButtonClick={() => setInfoMessage(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <DataTable rows={rows} headers={headers} isSortable>
        {({
          rows: tableRows,
          headers: tableHeaders,
          getTableProps,
          getHeaderProps,
          getRowProps,
          onInputChange,
        }: any) => (
          <TableContainer>
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch
                  placeholder="이름, 로그인, 이메일 검색..."
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onInputChange(e);
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                <Button
                  kind="ghost"
                  renderIcon={Renew}
                  iconDescription="새로고침"
                  hasIconOnly
                  onClick={loadUsers}
                  disabled={loading}
                />
              </TableToolbarContent>
            </TableToolbar>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loading description="사용자 목록 로딩 중..." withOverlay={false} small />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={UserMultiple}
                title="사용자 없음"
                description="AppEngine에 등록된 내부 사용자가 없습니다."
              />
            ) : (
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header: any) => (
                      <TableHeader key={header.key} {...getHeaderProps({ header })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row: any) => {
                    const user = rows.find((r) => r.id === row.id)?._user;
                    return (
                      <TableRow
                        key={row.id}
                        {...getRowProps({ row })}
                        style={{ cursor: 'pointer' }}
                        onClick={() => user && openUser(user)}
                      >
                        {row.cells.map((cell: any) => {
                          if (cell.info.header === 'active') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={cell.value ? 'green' : 'gray'} size="sm">
                                  {cell.value ? '활성' : '비활성'}
                                </Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'groups') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type="blue" size="sm">{cell.value}개</Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'actions') {
                            return (
                              <TableCell key={cell.id}>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  renderIcon={View}
                                  iconDescription="상세 보기"
                                  hasIconOnly
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (user) openUser(user);
                                  }}
                                />
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </DataTable>

      {totalItems > pageSize && (
        <Pagination
          totalItems={totalItems}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          page={page}
          onChange={({ page: p, pageSize: ps }: { page: number; pageSize: number }) => {
            setPage(p);
            setPageSize(ps);
          }}
        />
      )}

      {/* ── 사용자 상세 Modal ───────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onRequestClose={closeModal}
        modalHeading={selectedUser ? `${selectedUser.name} (${selectedUser.login})` : '사용자 상세'}
        primaryButtonText={editingGroups ? '저장' : '그룹 편집'}
        secondaryButtonText={editingGroups ? '취소' : '닫기'}
        onRequestSubmit={editingGroups ? saveGroups : () => setEditingGroups(true)}
        onSecondarySubmit={editingGroups ? () => { setEditingGroups(false); setSelectedGroupIDs(new Set(userGroups.map((g) => g.id))); } : closeModal}
        primaryButtonDisabled={saveLoading}
        size="lg"
      >
        {detailLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Loading description="로딩 중..." withOverlay={false} small />
          </div>
        ) : (
          <div>
            {detailError && (
              <InlineNotification
                kind="error"
                title="오류"
                subtitle={detailError}
                hideCloseButton={false}
                onCloseButtonClick={() => setDetailError(null)}
                style={{ marginBottom: '1rem' }}
              />
            )}
            {saveSuccess && (
              <InlineNotification
                kind="success"
                title="저장 완료"
                subtitle="그룹이 성공적으로 업데이트되었습니다."
                hideCloseButton
                style={{ marginBottom: '1rem' }}
              />
            )}

            {selectedUser && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p><strong>이메일:</strong> {getEmail(selectedUser) || '—'}</p>
                <p><strong>상태:</strong>{' '}
                  <Tag type={selectedUser.active ? 'green' : 'gray'} size="sm">
                    {selectedUser.active ? '활성' : '비활성'}
                  </Tag>
                </p>
              </div>
            )}

            {!editingGroups ? (
              /* ── 현재 그룹 목록 표시 ── */
              <div>
                <h5 style={{ marginBottom: '0.75rem' }}>할당된 그룹</h5>
                {userGroups.length === 0 ? (
                  <p style={{ color: '#6f6f6f' }}>할당된 그룹이 없습니다.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {userGroups.map((g) => (
                      <Tag key={g.id} type="blue" size="md">{getFullName(g)}</Tag>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── 그룹 편집 체크박스 ── */
              <div>
                <h5 style={{ marginBottom: '0.75rem' }}>그룹 선택</h5>
                <input
                  type="text"
                  placeholder="그룹 필터..."
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    marginBottom: '1rem',
                    background: '#2c2c2c',
                    border: '1px solid #525252',
                    borderRadius: '4px',
                    color: '#f4f4f4',
                  }}
                />
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {Object.entries(groupsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, grps]) => (
                    <div key={cat} style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {cat.toUpperCase()}
                      </p>
                      {grps.map((g) => (
                        <Checkbox
                          key={g.id}
                          id={`group-${g.id}`}
                          labelText={getFullName(g)}
                          checked={selectedGroupIDs.has(g.id)}
                          onChange={(_: unknown, { checked }: { checked: boolean }) => {
                            setSelectedGroupIDs((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(g.id);
                              else next.delete(g.id);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
