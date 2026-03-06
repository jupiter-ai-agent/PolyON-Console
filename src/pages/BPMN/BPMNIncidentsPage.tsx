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

function fmtDate(ts?: string) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

const headers = [
  { key: 'incidentType', header: '유형' },
  { key: 'processDefinitionId', header: '프로세스' },
  { key: 'processInstanceId', header: '인스턴스' },
  { key: 'causeIncidentId', header: '원인 ID' },
  { key: 'incidentMessage', header: '메시지' },
  { key: 'incidentTimestamp', header: '발생 시각' },
  { key: 'actions', header: '액션' },
];

export default function BPMNIncidentsPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/incidents`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setIncidents(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (incident: any) => {
    const key = incident.id || incident.causeIncidentId;
    setRetrying(key);
    try {
      await fetch(`${BASE}/jobs/${incident.jobId || ''}/retries`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ retries: 1 }) });
      load();
    } catch (_) {}
    setRetrying(null);
  };

  const rows = incidents.map((inc, idx) => ({
    id: String(idx),
    incidentType: inc.incidentType || '—',
    processDefinitionId: inc.processDefinitionId || inc.processDefinitionKey || '—',
    processInstanceId: inc.processInstanceId || '—',
    causeIncidentId: inc.causeIncidentId ? `${inc.causeIncidentId.slice(0, 12)}...` : '—',
    incidentMessage: inc.incidentMessage || '—',
    incidentTimestamp: fmtDate(inc.incidentTimestamp),
    _incident: inc,
  }));

  return (
    <>
      <PageHeader
        title="인시던트"
        description="프로세스 오류 및 실패 이벤트"
        actions={
          <Button kind="ghost" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : incidents.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#defbe6', border: '1px solid #24a148', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#24a148', fontWeight: 500 }}>
            인시던트가 없습니다. 모든 프로세스가 정상입니다.
          </span>
        </div>
      ) : (
        <>
          <div style={{ marginTop: '1.5rem', marginBottom: '1rem', padding: '1rem', background: '#fff1f1', border: '1px solid #da1e28', borderLeft: '4px solid #da1e28' }}>
            <strong style={{ color: '#da1e28' }}>{incidents.length}개의 인시던트가 감지되었습니다.</strong>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
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
                    {tableRows.map((row, rowIdx) => {
                      const orig = rows[rowIdx];
                      const incident = orig?._incident;
                      const retryKey = incident?.id || incident?.causeIncidentId;
                      return (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'incidentType' ? (
                                <Tag type="red">{cell.value}</Tag>
                              ) : cell.info.header === 'processDefinitionId' ? (
                                <span
                                  style={{ color: '#0f62fe', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => {
                                    const id = incident?.processDefinitionId;
                                    if (id) navigate(`/bpmn/processes/${id}`);
                                  }}
                                >
                                  {cell.value}
                                </span>
                              ) : cell.info.header === 'processInstanceId' ? (
                                <span
                                  style={{ color: '#0f62fe', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => {
                                    const id = incident?.processInstanceId;
                                    if (id) navigate(`/bpmn/instances/${id}`);
                                  }}
                                >
                                  {cell.value !== '—' ? `${(cell.value as string).slice(0, 12)}...` : '—'}
                                </span>
                              ) : cell.info.header === 'incidentMessage' ? (
                                <span
                                  style={{ maxWidth: 280, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  title={cell.value}
                                >
                                  {cell.value}
                                </span>
                              ) : cell.info.header === 'actions' ? (
                                <Button
                                  kind="ghost"
                                 
                                  disabled={retrying === retryKey}
                                  onClick={(e: any) => { e.stopPropagation(); handleRetry(incident); }}
                                >
                                  {retrying === retryKey ? '재시도 중...' : '재시도'}
                                </Button>
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
        </>
      )}
    </>
  );
}
