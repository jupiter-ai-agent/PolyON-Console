// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ContentSwitcher,
  Switch,
  TextInput,
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
  { key: 'stateTag', header: '상태' },
  { key: 'name', header: '이름' },
  { key: 'key', header: '키' },
  { key: 'version', header: '버전' },
  { key: 'resource', header: '리소스' },
  { key: 'deploymentId', header: '배포 ID' },
  { key: 'instances', header: '인스턴스' },
  { key: 'incidents', header: '인시던트' },
];

export default function BPMNProcessesPage() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, iRes] = await Promise.all([
        fetch(`${BASE}/processes?maxResults=500&sortBy=name&sortOrder=asc`),
        fetch(`${BASE}/incidents`),
      ]);
      if (!pRes.ok) throw new Error('HTTP ' + pRes.status);
      const pData = await pRes.json();
      setProcesses(Array.isArray(pData) ? pData : []);
      if (iRes.ok) {
        const iData = await iRes.json();
        setIncidents(Array.isArray(iData) ? iData : []);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const incidentCountMap: Record<string, number> = {};
  incidents.forEach(inc => {
    const key = inc.processDefinitionId || inc.processDefinitionKey || '';
    if (key) incidentCountMap[key] = (incidentCountMap[key] || 0) + 1;
  });

  const filtered = processes.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.key || '').toLowerCase().includes(q);
  });

  const rows = filtered.map((p, i) => {
    const incCount = incidentCountMap[p.id] || incidentCountMap[p.key] || 0;
    return {
      id: String(i),
      stateTag: p.suspended ? 'suspended' : 'active',
      name: p.name || '(없음)',
      key: p.key || '—',
      version: p.version ?? '—',
      resource: p.resource || '—',
      deploymentId: p.deploymentId ? `${p.deploymentId.slice(0, 12)}...` : '—',
      instances: p.instances ?? 0,
      incidents: incCount,
      suspended: p.suspended,
      processDefinitionId: p.id,
    };
  });

  return (
    <>
      <PageHeader
        title="프로세스 정의"
        description="배포된 BPMN 프로세스 목록"
        actions={
          <Button kind="ghost" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {/* 검색 + 뷰 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <TextInput
            id="process-search"
            labelText=""
            placeholder="프로세스 검색 (이름 또는 키)"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
           
          />
        </div>
        <ContentSwitcher
         
          onChange={({ name }: any) => setViewMode(name)}
          selectedIndex={viewMode === 'list' ? 0 : 1}
        >
          <Switch name="list" text="목록" />
          <Switch name="preview" text="미리보기" />
        </ContentSwitcher>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0' }}>
          {search ? '검색 결과가 없습니다.' : '배포된 프로세스 정의가 없습니다.'}
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>프로세스 정의 ({filtered.length})</span>
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
                    return (
                      <TableRow
                        key={row.id}
                        {...getRowProps({ row })}
                        style={{ cursor: 'pointer' }}
                        onClick={() => orig?.processDefinitionId && navigate(`/bpmn/processes/${orig.processDefinitionId}`)}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f4f4f4'; }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = ''; }}
                      >
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'stateTag' ? (
                              <Tag type={orig?.suspended ? 'gray' : 'green'}>
                                {orig?.suspended ? '일시정지' : '활성'}
                              </Tag>
                            ) : cell.info.header === 'incidents' ? (
                              <span style={{ color: (cell.value as number) > 0 ? '#da1e28' : undefined, fontWeight: (cell.value as number) > 0 ? 600 : undefined }}>
                                {cell.value}
                              </span>
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
      ) : (
        /* 미리보기 카드 그리드 */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filtered.map((p) => {
            const incCount = incidentCountMap[p.id] || incidentCountMap[p.key] || 0;
            return (
              <div
                key={p.id}
                style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem', cursor: 'pointer' }}
                onClick={() => navigate(`/bpmn/processes/${p.id}`)}
                onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f4f4f4'; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.background = '#fff'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{p.name || '(없음)'}</span>
                  <Tag type={p.suspended ? 'gray' : 'green'}>
                    {p.suspended ? '일시정지' : '활성'}
                  </Tag>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: '0.5rem' }}>
                  키: <code style={{ fontSize: '0.8125rem' }}>{p.key || '—'}</code>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: '0.75rem' }}>
                  버전: {p.version ?? '—'}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
                  <span>
                    인스턴스: <strong>{p.instances ?? 0}</strong>
                  </span>
                  <span style={{ color: incCount > 0 ? '#da1e28' : undefined }}>
                    인시던트: <strong>{incCount}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
