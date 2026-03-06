// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, TextInput, Tag,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

const headers = [
  { key: 'username', header: '사용자명' },
  { key: 'fullName', header: '이름' },
  { key: 'email', header: '이메일' },
  { key: 'role', header: '역할' },
  { key: 'nickname', header: '닉네임' },
];

export default function ChatUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/users?page=0&per_page=200`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setUsers(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    !search ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(u => {
    const isAdmin = u.roles?.includes('system_admin');
    return {
      id: u.id || String(filtered.indexOf(u)),
      username: u.username || '—',
      fullName: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
      email: u.email || '—',
      role: <Tag type={isAdmin ? 'purple' : 'gray'}>{isAdmin ? '관리자' : '사용자'}</Tag>,
      nickname: u.nickname || '—',
    };
  });

  return (
    <>
      <PageHeader
        title="사용자 관리"
        description="Mattermost 사용자 목록"
        actions={
          <Button
            kind="ghost"
           
            renderIcon={Renew}
            onClick={load}
          >
            새로고침
          </Button>
        }
      />

      {/* Search */}
      <div style={{ marginTop: '1rem', maxWidth: 400 }}>
        <TextInput
          id="user-search"
          labelText=""
          hideLabel
          placeholder="사용자명, 이름, 이메일로 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)', marginTop: '1rem' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28', marginTop: '1rem' }}>오류: {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
          {search ? '검색 결과 없음' : '사용자가 없습니다.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              사용자 목록 ({filtered.length}{search ? `/${users.length}` : ''})
            </span>
          </div>
          <DataTable rows={rows} headers={headers}>
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
        </div>
      )}
    </>
  );
}
