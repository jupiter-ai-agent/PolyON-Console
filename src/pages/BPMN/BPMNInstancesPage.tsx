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
  Tag,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

const headers = [
  { key: 'instanceId', header: '인스턴스 ID' },
  { key: 'processDefinitionKey', header: '프로세스' },
  { key: 'businessKey', header: '비즈니스 키' },
  { key: 'status', header: '상태' },
  { key: 'incidents', header: '인시던트' },
];

export default function BPMNInstancesPage() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/instances?maxResults=500`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setInstances(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const running = instances.filter(i => !i.suspended).length;
  const suspended = instances.filter(i => i.suspended).length;

  const rows = instances.map((i, idx) => ({
    id: String(idx),
    instanceId: i.id || '—',
    processDefinitionKey: i.processDefinitionKey || '—',
    businessKey: i.businessKey || '—',
    status: i.suspended ? '일시정지' : '실행 중',
    incidents: i.incidents?.length > 0 ? `${i.incidents.length}개` : '없음',
    suspended: i.suspended,
    incidentCount: i.incidents?.length ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="실행 중 인스턴스"
        description="현재 실행 중인 프로세스 인스턴스"
        actions={
          <Button kind="ghost" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {/* Stats */}
      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0', marginTop: '1.5rem', marginBottom: '1rem' }}>
          {[
            { label: '전체', value: instances.length, color: '#525252' },
            { label: '실행 중', value: running, color: '#24a148' },
            { label: '일시정지', value: suspended, color: '#8a6d00' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: s.color }}>{s.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : instances.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0' }}>
          실행 중인 인스턴스가 없습니다.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>인스턴스 목록 ({instances.length})</span>
          </div>
          <DataTable rows={rows} headers={headers}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()}>
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
                    const original = instances[rowIdx];
                    const incidentCount = original?.incidents?.length ?? 0;
                    return (
                      <TableRow
                        key={row.id}
                        {...getRowProps({ row })}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          const orig = instances[rowIdx];
                          if (orig?.id) navigate(`/bpmn/instances/${orig.id}`);
                        }}
                      >
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'status' ? (
                              <Tag type={original?.suspended ? 'teal' : 'green'}>
                                {cell.value}
                              </Tag>
                            ) : cell.info.header === 'incidents' ? (
                              incidentCount > 0 ? (
                                <Tag type="red">{cell.value}</Tag>
                              ) : (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)' }}>{cell.value}</span>
                              )
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
