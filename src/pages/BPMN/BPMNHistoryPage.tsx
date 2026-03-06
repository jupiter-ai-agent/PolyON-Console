// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dropdown,
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

function duration(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return '—';
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (ms < 0) return '—';
  if (ms < 60000) return Math.round(ms / 1000) + '초';
  if (ms < 3600000) return Math.round(ms / 60000) + '분';
  return Math.round(ms / 3600000) + '시간';
}

const STATE_MAP: Record<string, ['green' | 'teal' | 'red' | 'blue' | 'gray', string]> = {
  COMPLETED:             ['green', '완료'],
  EXTERNALLY_TERMINATED: ['teal', '외부 종료'],
  INTERNALLY_TERMINATED: ['red', '내부 종료'],
  ACTIVE:                ['blue', '실행 중'],
};

const STATE_FILTER_ITEMS = [
  { id: 'ALL', label: '전체' },
  { id: 'COMPLETED', label: '완료' },
  { id: 'EXTERNALLY_TERMINATED', label: '외부 종료' },
  { id: 'INTERNALLY_TERMINATED', label: '내부 종료' },
];

const headers = [
  { key: 'instanceId', header: '인스턴스 ID' },
  { key: 'processDefinitionKey', header: '프로세스' },
  { key: 'state', header: '상태' },
  { key: 'startTime', header: '시작' },
  { key: 'endTime', header: '종료' },
  { key: 'duration', header: '소요 시간' },
];

export default function BPMNHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/history?maxResults=100&sortBy=startTime&sortOrder=desc`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = stateFilter === 'ALL' ? history : history.filter(h => h.state === stateFilter);

  const rows = filtered.map((h, i) => ({
    id: String(i),
    instanceId: h.id ? `${h.id.slice(0, 12)}...` : '—',
    processDefinitionKey: h.processDefinitionKey || '—',
    state: h.state || '—',
    startTime: fmtDate(h.startTime),
    endTime: fmtDate(h.endTime),
    duration: duration(h.startTime, h.endTime),
    _state: h.state,
    _processDefinitionId: h.processDefinitionId || h.processDefinitionKey,
  }));

  return (
    <>
      <PageHeader
        title="실행 이력"
        description="완료 및 종료된 프로세스 인스턴스 이력"
        actions={
          <Button kind="ghost" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {/* 상태 필터 */}
      <div style={{ marginTop: '1rem', marginBottom: '1rem', maxWidth: 240 }}>
        <Dropdown
          id="history-state-filter"
          titleText=""
          label="상태 필터"
          items={STATE_FILTER_ITEMS}
          itemToString={(item: any) => item?.label || ''}
          selectedItem={STATE_FILTER_ITEMS.find(i => i.id === stateFilter) || STATE_FILTER_ITEMS[0]}
          onChange={({ selectedItem }: any) => setStateFilter(selectedItem?.id || 'ALL')}
         
        />
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          히스토리 데이터가 없습니다.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>프로세스 히스토리 ({filtered.length}건)</span>
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
                  {tableRows.map((row, rowIdx) => {
                    const orig = rows[rowIdx];
                    const stateKey = orig?._state || '';
                    const [tagType, tagLabel] = STATE_MAP[stateKey] ?? ['gray', stateKey || '—'];
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'instanceId' ? (
                              <span
                                style={{ color: '#0f62fe', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                  const defId = orig?._processDefinitionId;
                                  if (defId) navigate(`/bpmn/processes/${defId}`);
                                }}
                              >
                                {cell.value}
                              </span>
                            ) : cell.info.header === 'state' ? (
                              <Tag type={tagType}>{tagLabel}</Tag>
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
