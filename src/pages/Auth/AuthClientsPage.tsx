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
  { key: 'clientId', header: 'Client ID' },
  { key: 'protocol', header: '프로토콜' },
  { key: 'type', header: '타입' },
  { key: 'enabled', header: '상태' },
  { key: 'redirectUris', header: 'Redirect URIs' },
];

function ClientsTable({ realm }: { realm: string }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/auth/clients?realm=${realm}`)
      .then(data => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [realm]);

  const filtered = clients.filter(c =>
    !search || (c.clientId || '').toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(c => ({
    id: c.id || c.clientId,
    clientId: c.clientId || '-',
    protocol: c.protocol || '-',
    type: c.publicClient ? 'Public' : 'Confidential',
    enabled: c.enabled,
    redirectUris: Array.isArray(c.redirectUris) ? c.redirectUris.join(', ') : '-',
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
                placeholder="Client ID 검색"
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
                      ) : cell.info.header === 'type' ? (
                        <Tag type={cell.value === 'Public' ? 'blue' : 'purple'}>
                          {cell.value}
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

export default function AuthClientsPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>클라이언트</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          Keycloak OIDC/SAML 클라이언트 관리
        </p>
      </div>

      <Tabs>
        <TabList aria-label="Realm 선택">
          <Tab>admin</Tab>
          <Tab>polyon</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ClientsTable realm="admin" />
          </TabPanel>
          <TabPanel>
            <ClientsTable realm="polyon" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
