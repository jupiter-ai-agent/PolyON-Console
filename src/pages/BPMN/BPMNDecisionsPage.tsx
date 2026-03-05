// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

const headers = [
  { key: 'name', header: '이름' },
  { key: 'key', header: '키' },
  { key: 'version', header: '버전' },
  { key: 'tenantId', header: 'Tenant ID' },
];

export default function BPMNDecisionsPage() {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/decisions?maxResults=500&sortBy=name&sortOrder=asc`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setDecisions(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = decisions.map((d, i) => ({
    id: String(i),
    name: d.name || '(없음)',
    key: d.key || '—',
    version: d.version ?? '—',
    tenantId: d.tenantId || '—',
    definitionId: d.id,
  }));

  return (
    <>
      <PageHeader
        title="의사결정 정의"
        description="배포된 DMN 의사결정 테이블"
        actions={
          <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : decisions.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          배포된 의사결정 정의가 없습니다
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>의사결정 정의 ({decisions.length})</span>
          </div>
          <DataTable rows={rows} headers={headers}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()} size="sm">
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, rowIdx) => {
                    const original = rows[rowIdx];
                    const def = decisions[rowIdx];
                    return (
                      <TableRow
                        key={row.id}
                        {...getRowProps({ row })}
                        style={{ cursor: 'pointer' }}
                        onClick={() => def?.id && navigate(`/bpmn/decisions/${def.id}`)}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f4f4f4'; }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = ''; }}
                      >
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'name' ? (
                              <span style={{ color: '#0f62fe' }}>{cell.value}</span>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataTable>
        </div>
      )}
    </>
  );
}
