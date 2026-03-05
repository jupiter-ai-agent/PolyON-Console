// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Button,
  Tag,
  InlineLoading,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Renew, Terminal } from '@carbon/icons-react';

function HealthBadge({ status }) {
  const m = (status || '').match(/\((healthy|unhealthy|health: starting)\)/);
  const health = m ? m[1] : '';
  if (health === 'healthy') return <Tag type="green">healthy</Tag>;
  if (health === 'unhealthy') return <Tag type="red">unhealthy</Tag>;
  if (health === 'health: starting') return <Tag type="warm-gray">starting</Tag>;
  return null;
}

function formatPorts(portsStr) {
  if (!portsStr) return '—';
  const matches = portsStr.match(/0\.0\.0\.0:(\d+)->(\d+)/g) || [];
  if (!matches.length) return '—';
  return matches.map(m => {
    const parts = m.match(/0\.0\.0\.0:(\d+)->(\d+)/);
    return parts ? parts[1] : '';
  }).filter(Boolean).join(', ');
}

export default function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logContainer, setLogContainer] = useState(null);
  const [logs, setLogs] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/containers/');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API error');
      const sorted = (data.containers || []).sort((a, b) => {
        if (a.state === 'running' && b.state !== 'running') return -1;
        if (a.state !== 'running' && b.state === 'running') return 1;
        return a.name.localeCompare(b.name);
      });
      setContainers(sorted);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showLogs = async (name) => {
    setLogContainer(name);
    setLogLoading(true);
    setLogs('');
    try {
      const res = await fetch(`/api/v1/containers/${name}/logs?tail=100`);
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        setLogs(data.error || '로그를 가져올 수 없습니다.');
      }
    } catch (e) {
      setLogs(e.message);
    }
    setLogLoading(false);
  };

  const restart = async (name) => {
    if (!confirm(`'${name}'을 재시작하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/containers/${name}/restart`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTimeout(() => load(), 2000);
      } else {
        alert('재시작 실패: ' + (data.error || ''));
      }
    } catch (e) {
      alert('오류: ' + e.message);
    }
  };

  const running   = containers.filter(c => c.state === 'running' && !c.status.includes('unhealthy'));
  const unhealthy = containers.filter(c => c.status.includes('unhealthy'));
  const stopped   = containers.filter(c => c.state !== 'running');

  const tableHeaders = [
    { key: 'dot',    header: '' },
    { key: 'name',   header: '컨테이너' },
    { key: 'image',  header: '이미지' },
    { key: 'status', header: '상태' },
    { key: 'ports',  header: '포트' },
    { key: 'actions',header: '' },
  ];

  const tableRows = containers.map((c, i) => ({
    id:      String(i),
    dot:     c,           // full object — used for dot color rendering
    name:    c.name.replace('polyon-', ''),
    image:   c.image.replace(/^(docker\.io\/|library\/)/, ''),
    status:  c,           // full object — used for status + badge rendering
    ports:   formatPorts(c.ports),
    actions: c.name,      // container name — used for action buttons
  }));

  return (
    <div style={{ padding: '0 32px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Containers</h1>
          <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>PolyON Docker 컨테이너 상태</p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>새로고침</Button>
      </div>

      {loading ? (
        <InlineLoading description="컨테이너 목록 로딩 중..." />
      ) : error ? (
        <div style={{ color: 'var(--cds-support-error)', padding: '16px' }}>{error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: 'var(--cds-text-secondary)' }}>총 {containers.length}개</span>
            <span style={{ color: '#198038' }}>● {running.length} 정상</span>
            {unhealthy.length > 0 && <span style={{ color: '#da1e28' }}>● {unhealthy.length} 비정상</span>}
            {stopped.length > 0  && <span style={{ color: '#da1e28' }}>● {stopped.length} 중지</span>}
          </div>

          <DataTable rows={tableRows} headers={tableHeaders}>
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
                  {rows.map((row, ri) => {
                    const c = containers[ri];
                    const isRunning   = c?.state === 'running';
                    const isUnhealthy = c?.status?.includes('unhealthy');
                    const dotColor    = !isRunning ? '#da1e28' : isUnhealthy ? '#da1e28' : '#198038';
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map(cell => {
                          if (cell.info.header === 'dot') {
                            return (
                              <TableCell key={cell.id} style={{ textAlign: 'center', width: 30 }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: dotColor }} />
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'image') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                                  {cell.value}
                                </span>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'status') {
                            return (
                              <TableCell key={cell.id}>
                                {c?.status} <HealthBadge status={c?.status} />
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'ports') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                                  {cell.value}
                                </span>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'actions') {
                            return (
                              <TableCell key={cell.id}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <Button kind="ghost" size="sm" hasIconOnly renderIcon={Terminal} iconDescription="로그" onClick={() => showLogs(cell.value)} />
                                  <Button kind="ghost" size="sm" hasIconOnly renderIcon={Renew}    iconDescription="재시작" onClick={() => restart(cell.value)} />
                                </div>
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataTable>

          {/* Log Viewer */}
          {logContainer && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{logContainer} 로그</h4>
                <Button kind="ghost" size="sm" onClick={() => setLogContainer(null)}>닫기</Button>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', background: '#262626', color: '#f4f4f4', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                {logLoading ? '로딩 중...' : logs}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
