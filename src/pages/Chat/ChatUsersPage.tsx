import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, Tag, InlineNotification, Dropdown, Toggle,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableToolbar, TableToolbarContent, TableToolbarSearch,
  ComposedModal, ModalHeader, ModalBody, ModalFooter,
  DataTableSkeleton
} from '@carbon/react';
import { Renew, UserAdmin, User } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

async function chatFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const { getToken } = await import('../../api/client');
  const token = getToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface ChatUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  nickname?: string;
  roles?: string;
  delete_at?: number;
  create_at?: number;
  update_at?: number;
}

interface ConfirmAction {
  type: 'role' | 'deactivate' | 'activate';
  user: ChatUser;
  newRole?: string;
}

const headers = [
  { key: 'username', header: '사용자명' },
  { key: 'fullName', header: '이름' },
  { key: 'email', header: '이메일' },
  { key: 'role', header: '역할' },
  { key: 'status', header: '상태' },
  { key: 'nickname', header: '닉네임' },
  { key: 'actions', header: '작업' },
];

const roleOptions = [
  { value: 'system_user', text: '일반 사용자' },
  { value: 'system_admin system_user', text: '관리자' }
];

export default function ChatUsersPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState<string>(''); // user ID that's being processed

  // Notification
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error'; 
    title: string; 
    subtitle: string 
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatFetch<ChatUser[]>('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase().includes(query) ||
      user.nickname?.toLowerCase().includes(query)
    );
  });

  const isAdmin = (user: ChatUser) => {
    return user.roles?.includes('system_admin') || false;
  };

  const isActive = (user: ChatUser) => {
    return !user.delete_at || user.delete_at === 0;
  };

  const handleRoleChange = (user: ChatUser, newRole: string) => {
    setConfirmAction({
      type: 'role',
      user,
      newRole
    });
    setConfirmModal(true);
  };

  const handleStatusToggle = (user: ChatUser) => {
    const active = isActive(user);
    setConfirmAction({
      type: active ? 'deactivate' : 'activate',
      user
    });
    setConfirmModal(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    setActionLoading(confirmAction.user.id);
    
    try {
      if (confirmAction.type === 'role') {
        await chatFetch(`/users/${confirmAction.user.id}/roles`, {
          method: 'PUT',
          body: JSON.stringify({
            roles: confirmAction.newRole
          })
        });
        
        setNotification({
          type: 'success',
          title: '역할 변경 완료',
          subtitle: `${confirmAction.user.username}의 역할이 변경되었습니다.`
        });
      } else {
        const active = confirmAction.type === 'activate';
        await chatFetch(`/users/${confirmAction.user.id}/active`, {
          method: 'PUT',
          body: JSON.stringify({
            active
          })
        });
        
        setNotification({
          type: 'success',
          title: active ? '활성화 완료' : '비활성화 완료',
          subtitle: `${confirmAction.user.username}이 ${active ? '활성화' : '비활성화'}되었습니다.`
        });
      }
      
      setConfirmModal(false);
      setConfirmAction(null);
      await loadUsers();
    } catch (err) {
      setNotification({
        type: 'error',
        title: '작업 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setActionLoading('');
    }
  };

  const rows = filteredUsers.map(user => {
    const admin = isAdmin(user);
    const active = isActive(user);
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
    const currentRole = admin ? 'system_admin system_user' : 'system_user';
    
    return {
      id: user.id,
      username: user.username,
      fullName,
      email: user.email || '—',
      role: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag type={admin ? 'purple' : 'gray'}>
            {admin ? '관리자' : '사용자'}
          </Tag>
          <div style={{ width: '120px' }}>
            <Dropdown
              id={`role-${user.id}`}
              label="역할"
              titleText=""
              items={roleOptions}
              selectedItem={roleOptions.find(opt => opt.value === currentRole)}
              size="sm"
              onChange={(e) => {
                if (e.selectedItem && e.selectedItem.value !== currentRole) {
                  handleRoleChange(user, e.selectedItem.value);
                }
              }}
              disabled={actionLoading === user.id}
              light
            />
          </div>
        </div>
      ),
      status: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag type={active ? 'green' : 'red'}>
            {active ? '활성' : '비활성'}
          </Tag>
          <Toggle
            id={`status-${user.id}`}
            size="sm"
            toggled={active}
            onToggle={() => handleStatusToggle(user)}
            disabled={actionLoading === user.id}
            hideLabel
          />
        </div>
      ),
      nickname: user.nickname || '—',
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {admin ? <UserAdmin size={16} /> : <User size={16} />}
          {!active && (
            <Tag type="red" size="sm">비활성</Tag>
          )}
        </div>
      )
    };
  });

  const getConfirmMessage = () => {
    if (!confirmAction) return { title: '', message: '' };
    
    const { type, user, newRole } = confirmAction;
    
    switch (type) {
      case 'role':
        const isPromoting = newRole?.includes('system_admin');
        return {
          title: `역할 변경 확인`,
          message: `"${user.username}"의 역할을 ${isPromoting ? '관리자' : '일반 사용자'}로 변경하시겠습니까?`
        };
      case 'deactivate':
        return {
          title: '사용자 비활성화 확인',
          message: `"${user.username}"을 비활성화하시겠습니까? 비활성화된 사용자는 시스템에 로그인할 수 없습니다.`
        };
      case 'activate':
        return {
          title: '사용자 활성화 확인',
          message: `"${user.username}"을 활성화하시겠습니까?`
        };
      default:
        return { title: '', message: '' };
    }
  };

  const confirmInfo = getConfirmMessage();

  return (
    <>
      <PageHeader
        title="사용자 관리"
        description="Mattermost 사용자 목록 및 권한 관리"
        actions={
          <Button
            kind="ghost"
            renderIcon={Renew}
            onClick={loadUsers}
            disabled={loading}
          >
            새로고침
          </Button>
        }
      />

      {/* Notification */}
      {notification && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={notification.type}
            title={notification.title}
            subtitle={notification.subtitle}
            onCloseButtonClick={() => setNotification(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="로딩 오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '1.5rem' }}>
          <DataTableSkeleton />
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <DataTable rows={rows} headers={headers}>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableProps,
              getHeaderProps,
              getRowProps
            }) => (
              <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="사용자명, 이름, 이메일로 검색..."
                      onChange={(event, value) => {
                        setSearchQuery(value || '');
                      }}
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map(h => (
                        <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length}>
                          <div style={{ 
                            padding: '3rem', 
                            textAlign: 'center', 
                            color: 'var(--cds-text-secondary)' 
                          }}>
                            {searchQuery ? '검색 결과가 없습니다.' : '사용자가 없습니다.'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map(row => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {/* Summary info */}
                <div style={{ 
                  padding: '1rem 1.25rem', 
                  borderTop: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f4f4f4',
                  fontSize: '0.875rem',
                  color: 'var(--cds-text-secondary)'
                }}>
                  <span>
                    전체 사용자: {users.length} 
                    {searchQuery && ` | 검색 결과: ${filteredUsers.length}`}
                  </span>
                  <span>
                    활성: {users.filter(u => isActive(u)).length} |
                    관리자: {users.filter(u => isAdmin(u)).length}
                  </span>
                </div>
              </div>
            )}
          </DataTable>
        </div>
      )}

      {/* 확인 모달 */}
      <ComposedModal open={confirmModal} onClose={() => setConfirmModal(false)}>
        <ModalHeader title={confirmInfo.title} />
        <ModalBody>
          <p>{confirmInfo.message}</p>
          {confirmAction && (
            <div style={{ 
              background: '#f4f4f4', 
              border: '1px solid #e0e0e0', 
              padding: '1rem', 
              marginTop: '1rem',
              borderRadius: '4px'
            }}>
              <strong>사용자:</strong> {confirmAction.user.username}
              <br />
              <strong>이메일:</strong> {confirmAction.user.email || '—'}
              <br />
              <strong>현재 역할:</strong> {isAdmin(confirmAction.user) ? '관리자' : '일반 사용자'}
              <br />
              <strong>현재 상태:</strong> {isActive(confirmAction.user) ? '활성' : '비활성'}
              
              {confirmAction.type === 'role' && confirmAction.newRole && (
                <>
                  <br />
                  <strong>변경될 역할:</strong> {
                    confirmAction.newRole.includes('system_admin') ? '관리자' : '일반 사용자'
                  }
                </>
              )}
            </div>
          )}
          
          {confirmAction?.type === 'deactivate' && (
            <p style={{ color: '#da1e28', marginTop: '1rem' }}>
              <strong>주의:</strong> 비활성화된 사용자는 시스템에 로그인할 수 없습니다.
            </p>
          )}
          
          {confirmAction?.type === 'role' && confirmAction.newRole?.includes('system_admin') && (
            <p style={{ color: '#f1c21b', marginTop: '1rem' }}>
              <strong>경고:</strong> 관리자는 시스템의 모든 기능에 접근할 수 있습니다.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setConfirmModal(false)}>
            취소
          </Button>
          <Button 
            kind={confirmAction?.type === 'deactivate' ? 'danger' : 'primary'}
            onClick={executeAction}
            disabled={!!actionLoading}
          >
            {actionLoading ? '처리 중...' : '확인'}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </>
  );
}