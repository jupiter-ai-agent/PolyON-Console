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
  InlineLoading,
  InlineNotification,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { apiFetch } from '../../api/client';

const HEADERS = [
  { key: 'name', header: '그룹명' },
  { key: 'path', header: '경로' },
  { key: 'subGroupCount', header: '하위 그룹 수' },
];

export default function AuthGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/v1/auth/groups?realm=polyon')
      .then(r => r.json())
      .then(data => {
        setGroups(data.groups || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filtered = groups.filter(g =>
    !search ||
    (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (g.path || '').toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(g => ({
    id: g.id || g.name,
    name: g.name || '-',
    path: g.path || '-',
    subGroupCount: g.subGroupCount ?? 0,
  }));

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>그룹</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          polyon Realm 그룹 목록
        </p>
      </div>

      {loading && <InlineLoading description="로딩 중..." />}

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} />
      )}

      {!loading && !error && (
        <DataTable rows={rows} headers={HEADERS}>
          {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    placeholder="그룹명 / 경로 검색"
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
