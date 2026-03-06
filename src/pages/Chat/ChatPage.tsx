// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { Chat } from '@carbon/icons-react';
import {
  Button, Tag,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
} from '@carbon/react';

const BASE = '/api/v1/engines/chat';

async function chatFetch(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function StatCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>{sub}</div>}
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
  const { installedServices } = useAppStore();
  const [status, setStatus] = useState<string>('unknown');
  const [version, setVersion] = useState<string>('—');
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 서비스 설치 여부 확인
  const isServiceInstalled = installedServices.includes('chat');

  // 미설치 서비스인 경우 EmptyState 표시
  if (!isServiceInstalled) {
    return (
      <>
        <PageHeader
          title="Mattermost"
          description="팀 커뮤니케이션 플랫폼"
        />
        <div style={{ padding: '2rem 0' }}>
          <EmptyState
            icon={Chat}
            title="이 서비스는 아직 설치되지 않았습니다"
            description="Mattermost는 현재 설치되지 않았습니다. Applications에서 설치할 수 있습니다."
            actionLabel="Applications로 이동"
            onAction={() => navigate('/apps')}
          />
        </div>
      </>
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Ping
      try {
        const ping = await chatFetch('/ping');
        setStatus(ping.status === 'OK' ? 'healthy' : 'down');
        setVersion(ping.version || ping.server_version || '—');
      } catch { setStatus('down'); }

      // Data
      try {
        const [tRes, uRes, sRes] = await Promise.all([
          chatFetch('/teams?page=0&per_page=100'),
          chatFetch('/users?page=0&per_page=100'),
          chatFetch('/stats'),
        ]);
        setTeams(Array.isArray(tRes) ? tRes : []);
        setUsers(Array.isArray(uRes) ? uRes : []);
        setStats(sRes);
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  const totalUsers = stats?.total_users_count || users.length;
  const totalChannels = stats?.total_channel_count || '—';
  const todayMessages = stats?.today_message_count || '—';

  const teamRows = teams.slice(0, 5).map((t, i) => ({
    id: t.id || String(i),
    name: t.name || '—',
    displayName: t.display_name || '—',
    type: (
      <Tag type={t.type === 'O' ? 'blue' : 'gray'}>
        {t.type === 'O' ? '공개' : '비공개'}
      </Tag>
    ),
    memberCount: t.member_count ?? '—',
  }));

  const userRows = users.slice(0, 5).map((u, i) => {
    const isAdmin = u.roles?.includes('system_admin');
    return {
      id: u.id || String(i),
      username: u.username || '—',
      fullName: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
      email: u.email || '—',
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
        title="Mattermost"
        description={`팀 커뮤니케이션 플랫폼${version !== '—' ? ` — v${version}` : ''}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={status as any} />
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
            <StatCard label="팀" value={teams.length} sub="Teams" />
            <StatCard label="전체 사용자" value={totalUsers} sub="Users" />
            <StatCard label="공개 채널" value={totalChannels} sub="Channels" />
            <StatCard label="오늘 메시지" value={todayMessages} sub="Messages Today" />
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
            {[
              { label: '팀 관리', path: '/chat/teams', desc: '팀 목록 및 설정', color: '#0f62fe' },
              { label: '채널 관리', path: '/chat/channels', desc: '채널 목록', color: '#24a148' },
              { label: '사용자 관리', path: '/chat/users', desc: '사용자 목록', color: '#6929c4' },
              { label: '설정', path: '/chat/settings', desc: '서비스 설정', color: '#525252' },
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
                <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem', fontWeight: 400, display: 'block' }}>{item.desc}</span>
              </Button>
            ))}
          </div>

          {/* Teams table */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>팀 목록</h4>
              <Button kind="ghost" onClick={() => navigate('/chat/teams')}>
                전체 보기
              </Button>
            </div>
            {teams.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>팀이 없습니다.</div>
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

          {/* Recent users */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 사용자</h4>
              <Button kind="ghost" onClick={() => navigate('/chat/users')}>
                전체 보기
              </Button>
            </div>
            {users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>사용자가 없습니다.</div>
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
