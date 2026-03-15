// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Tile,
  Tag,
  InlineLoading,
  InlineNotification,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Activity } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

const CLIENT_HEADERS = [
  { key: 'id', header: 'Client ID' },
  { key: 'active', header: '활성 세션' },
  { key: 'offline', header: '오프라인 세션' },
];

function SessionsView({ realm }: { realm: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/auth/sessions?realm=${realm}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [realm]);

  if (loading) return <InlineLoading description="로딩 중..." />;
  if (error) return <InlineNotification kind="error" title="오류" subtitle={error} />;
  if (!data) return null;

  const clientDetails = (data.client_details || []).map((c: any, i: number) => ({
    id: c.id || String(i),
    active: c.active ?? 0,
    offline: c.offline ?? 0,
  }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} />
            <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>활성 세션</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px', fontWeight: 600 }}>{data.active ?? 0}</span>
            <Tag type={data.active > 0 ? 'green' : 'gray'}>
              {data.active > 0 ? '온라인' : '없음'}
            </Tag>
          </div>
        </Tile>
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} />
            <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>오프라인 세션</span>
          </div>
          <span style={{ fontSize: '36px', fontWeight: 600 }}>{data.offline ?? 0}</span>
        </Tile>
      </div>

      {clientDetails.length > 0 && (
        <DataTable rows={clientDetails} headers={CLIENT_HEADERS}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer title="클라이언트별 세션">
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
                  {rows.map(row => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map(cell => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
}

export default function AuthSessionsPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>세션</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          Keycloak Realm 활성 세션 현황
        </p>
      </div>

      <Tabs>
        <TabList aria-label="Realm 선택">
          <Tab>admin</Tab>
          <Tab>polyon</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SessionsView realm="admin" />
          </TabPanel>
          <TabPanel>
            <SessionsView realm="polyon" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
