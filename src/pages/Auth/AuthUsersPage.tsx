// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  InlineLoading,
  InlineNotification,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { apiFetch } from '../../api/client';

const HEADERS = [
  { key: 'username', header: '사용자명' },
  { key: 'email', header: '이메일' },
  { key: 'enabled', header: '상태' },
  { key: 'emailVerified', header: '이메일 확인' },
  { key: 'createdAt', header: '생성일' },
];

function UsersTable({ realm }: { realm: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/auth/users?realm=${realm}&max=100`)
      .then(r => r.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [realm]);

  const filtered = users.filter(u =>
    !search ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(u => ({
    id: u.id || u.username,
    username: u.username || '-',
    email: u.email || '-',
    enabled: u.enabled,
    emailVerified: u.emailVerified,
    createdAt: u.createdTimestamp
      ? new Date(u.createdTimestamp).toLocaleDateString('ko-KR')
      : '-',
  }));

  if (loading) return <InlineLoading description="로딩 중..." />;
  if (error) return <InlineNotification kind="error" title="오류" subtitle={error} />;

  return (
    <DataTable rows={rows} headers={HEADERS}>
      {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <TableContainer>
          <TableToolbar>
            <TableToolbarContent>
              <TableToolbarSearch
                placeholder="사용자명 / 이메일 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </TableToolbarContent>
          </TableToolbar>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map(header => (
                  <TableHeader {...getHeaderProps({ header })} key={header.key}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map(row => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map(cell => (
                    <TableCell key={cell.id}>
                      {cell.info.header === 'enabled' ? (
                        <Tag type={cell.value ? 'green' : 'red'}>
                          {cell.value ? '활성' : '비활성'}
                        </Tag>
                      ) : cell.info.header === 'emailVerified' ? (
                        <Tag type={cell.value ? 'green' : 'gray'}>
                          {cell.value ? '확인됨' : '미확인'}
                        </Tag>
                      ) : (
                        cell.value
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}

export default function AuthUsersPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>사용자</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          Keycloak Realm 사용자 목록
        </p>
      </div>

      <Tabs>
        <TabList aria-label="Realm 선택">
          <Tab>admin</Tab>
          <Tab>polyon</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <UsersTable realm="admin" />
          </TabPanel>
          <TabPanel>
            <UsersTable realm="polyon" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
