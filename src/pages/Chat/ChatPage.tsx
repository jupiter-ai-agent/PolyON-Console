import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Button, Tag, InlineNotification,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  DataTableSkeleton
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

async function chatFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface Team {
  id: string;
  name: string;
  display_name: string;
  type: 'O' | 'I';
  member_count?: number;
  description?: string;
  create_at?: number;
}

interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: string;
  create_at?: number;
}

interface Stats {
  total_users_count: number;
  total_teams_count: number;
  total_channel_count: number;
  total_public_channel_count: number;
  total_private_channel_count: number;
  total_posts_count: number;
  today_message_count?: number;
}

interface PingResponse {
  status: string;
  version?: string;
  server_version?: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e0e0e0', 
      padding: '1.25rem',
      borderRadius: '4px'
    }}>
      <div style={{ 
        fontSize: '0.6875rem', 
        fontWeight: 600, 
        textTransform: 'uppercase', 
        letterSpacing: '0.32px', 
        color: 'var(--cds-text-helper)' 
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '2rem', 
        fontWeight: 300, 
        marginTop: '0.5rem',
        color: 'var(--cds-text-primary)'
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--cds-text-secondary)', 
          marginTop: '0.25rem' 
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const teamHeaders = [
  { key: 'name', header: '팀 이름' },
  { key: 'displayName', header: '표시 이름' },
  { key: 'type', header: '유형' },
  { key: 'memberCount', header: '멤버' },
];

const userHeaders = [
  { key: 'username', header: '사용자명' },
  { key: 'fullName', header: '이름' },
  { key: 'email', header: '이메일' },
  { key: 'role', header: '역할' },
];

export default function ChatPage() {
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'healthy' | 'down' | 'unknown'>('unknown');
  const [version, setVersion] = useState<string>('—');
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Ping
      try {
        const ping = await chatFetch<PingResponse>('/ping');
        setStatus(ping.status === 'OK' ? 'healthy' : 'down');
        setVersion(ping.version || ping.server_version || '—');
      } catch {
        setStatus('down');
      }

      // Load data in parallel
      const [teamsRes, usersRes, statsRes] = await Promise.allSettled([
        chatFetch<Team[]>('/teams'),
        chatFetch<User[]>('/users'),
        chatFetch<Stats>('/stats')
      ]);

      if (teamsRes.status === 'fulfilled') {
        setTeams(Array.isArray(teamsRes.value) ? teamsRes.value : []);
      }

      if (usersRes.status === 'fulfilled') {
        setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleLdapSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    
    try {
      await chatFetch('/ldap-sync', { method: 'POST' });
      setSyncMessage({ type: 'success', text: 'LDAP 동기화가 완료되었습니다.' });
    } catch (err) {
      setSyncMessage({ 
        type: 'error', 
        text: `LDAP 동기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}` 
      });
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsers = stats?.total_users_count || users.length;
  const totalTeams = stats?.total_teams_count || teams.length;
  const totalChannels = stats?.total_channel_count || '—';
  const totalPosts = stats?.total_posts_count || '—';

  const teamRows = teams.slice(0, 5).map((team, i) => ({
    id: team.id || String(i),
    name: team.name || '—',
    displayName: team.display_name || '—',
    type: (
      <Tag type={team.type === 'O' ? 'blue' : 'gray'}>
        {team.type === 'O' ? '공개' : '초대전용'}
      </Tag>
    ),
    memberCount: team.member_count ?? '—',
  }));

  const userRows = users.slice(0, 5).map((user, i) => {
    const isAdmin = user.roles?.includes('system_admin');
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
    
    return {
      id: user.id || String(i),
      username: user.username || '—',
      fullName,
      email: user.email || '—',
      role: (
        <Tag type={isAdmin ? 'purple' : 'gray'}>
          {isAdmin ? '관리자' : '사용자'}
        </Tag>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="Chat (Mattermost)"
        description={`팀 커뮤니케이션 플랫폼${version !== '—' ? ` — v${version}` : ''}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={status} />
            <Button
              kind="secondary"
              size="sm"
              renderIcon={Renew}
              disabled={syncLoading}
              onClick={handleLdapSync}
            >
              {syncLoading ? 'LDAP 동기화 중...' : 'LDAP 동기화'}
            </Button>
          </div>
        }
      />

      {/* Sync notification */}
      {syncMessage && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={syncMessage.type}
            title={syncMessage.type === 'success' ? '성공' : '오류'}
            subtitle={syncMessage.text}
            onCloseButtonClick={() => setSyncMessage(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="데이터 로딩 오류"
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
        <>
          {/* 통계 카드 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem', 
            marginTop: '1.5rem' 
          }}>
            <StatCard label="전체 사용자" value={totalUsers} sub="Users" />
            <StatCard label="전체 팀" value={totalTeams} sub="Teams" />
            <StatCard label="전체 채널" value={totalChannels} sub="Channels" />
            <StatCard label="전체 게시글" value={totalPosts} sub="Posts" />
          </div>

          {/* 빠른 링크 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '0.75rem', 
            marginTop: '1.5rem' 
          }}>
            {[
              { label: '팀 관리', path: '/chat/teams', desc: '팀 목록 및 설정', color: '#0f62fe' },
              { label: '채널 관리', path: '/chat/channels', desc: '채널 목록 및 관리', color: '#24a148' },
              { label: '사용자 관리', path: '/chat/users', desc: '사용자 목록 및 권한', color: '#6929c4' },
              { label: '서버 설정', path: '/chat/settings', desc: '서비스 구성', color: '#525252' },
            ].map(item => (
              <Button
                key={item.path}
                kind="ghost"
                onClick={() => navigate(item.path)}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderLeft: `3px solid ${item.color}`,
                  padding: '1rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  height: 'auto',
                  minHeight: '4rem',
                  color: '#161616',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                  {item.label}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--cds-text-secondary)', 
                  marginTop: '0.25rem', 
                  fontWeight: 400, 
                  display: 'block' 
                }}>
                  {item.desc}
                </span>
              </Button>
            ))}
          </div>

          {/* 최근 팀 목록 */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
            <div style={{ 
              padding: '1rem 1.25rem', 
              borderBottom: '1px solid #e0e0e0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 팀</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/chat/teams')}>
                전체 보기
              </Button>
            </div>
            {teamRows.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: 'var(--cds-text-secondary)', 
                fontSize: '0.875rem' 
              }}>
                팀이 없습니다.
              </div>
            ) : (
              <DataTable rows={teamRows} headers={teamHeaders}>
                {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
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
                      {tableRows.map(row => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>

          {/* 최근 사용자 목록 */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
            <div style={{ 
              padding: '1rem 1.25rem', 
              borderBottom: '1px solid #e0e0e0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 사용자</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/chat/users')}>
                전체 보기
              </Button>
            </div>
            {userRows.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: 'var(--cds-text-secondary)', 
                fontSize: '0.875rem' 
              }}>
                사용자가 없습니다.
              </div>
            ) : (
              <DataTable rows={userRows} headers={userHeaders}>
                {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
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
                      {tableRows.map(row => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>
        </>
      )}
    </>
  );
}