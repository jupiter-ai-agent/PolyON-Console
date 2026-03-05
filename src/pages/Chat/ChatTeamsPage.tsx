// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, Tag,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

const headers = [
  { key: 'name', header: '팀 이름' },
  { key: 'displayName', header: '표시 이름' },
  { key: 'type', header: '유형' },
  { key: 'memberCount', header: '멤버' },
  { key: 'description', header: '설명' },
];

export default function ChatTeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/teams?page=0&per_page=200`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setTeams(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = teams.map((t, i) => ({
    id: t.id || String(i),
    name: t.name || '—',
    displayName: t.display_name || '—',
    type: (
      <Tag type={t.type === 'O' ? 'blue' : 'gray'}>
        {t.type === 'O' ? '공개' : '비공개'}
      </Tag>
    ),
    memberCount: t.member_count ?? '—',
    description: t.description || '—',
  }));

  return (
    <>
      <PageHeader
        title="팀 관리"
        description="Mattermost 팀 목록 및 설정"
        actions={
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            onClick={load}
          >
            새로고침
          </Button>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : teams.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          팀이 없습니다.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>팀 목록 ({teams.length})</span>
          </div>
          <DataTable rows={rows} headers={headers}>
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()} size="sm">
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
