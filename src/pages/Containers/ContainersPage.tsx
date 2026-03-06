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

function PodStatusBadge({ status }) {
  if (status === 'Running') return <Tag type="green">Running</Tag>;
  if (status === 'Pending') return <Tag type="warm-gray">Pending</Tag>;
  if (status === 'Failed' || status === 'CrashLoopBackOff') return <Tag type="red">{status}</Tag>;
  if (status === 'Succeeded') return <Tag type="blue">Succeeded</Tag>;
  if (status === 'Terminating') return <Tag type="gray">Terminating</Tag>;
  return <Tag type="gray">{status || 'Unknown'}</Tag>;
}

function formatPorts(ports) {
  if (!ports || !Array.isArray(ports) || ports.length === 0) return '—';
  return ports.map(p => `${p.port}/${p.protocol}`).join(', ');
}

export default function ContainersPage() {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logPod, setLogPod] = useState(null);
  const [logs, setLogs] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/pods');
      if (!res.ok) {
        // API가 없으면 빈 상태 표시
        if (res.status === 404) {
          setPods([]);
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API error');
      const sorted = (data.pods || []).sort((a, b) => {
        if (a.status === 'Running' && b.status !== 'Running') return -1;
        if (a.status !== 'Running' && b.status === 'Running') return 1;
        return a.name.localeCompare(b.name);
      });
      setPods(sorted);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showLogs = async (name) => {
    setLogPod(name);
    setLogLoading(true);
    setLogs('');
    try {
      const res = await fetch(`/api/v1/pods/${name}/logs?tail=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        setLogs(data.error || '로그를 가져올 수 없습니다.');
      }
    } catch (e) {
      setLogs('로그 API를 사용할 수 없습니다: ' + e.message);
    }
    setLogLoading(false);
  };

  const restart = async (name) => {
    if (!confirm(`Pod '${name}'을 재시작하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/pods/${name}/restart`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setTimeout(() => load(), 2000);
      } else {
        alert('재시작 실패: ' + (data.error || ''));
      }
    } catch (e) {
      alert('Pod 재시작 API를 사용할 수 없습니다: ' + e.message);
    }
  };

  const running = pods.filter(p => p.status === 'Running');
  const pending = pods.filter(p => p.status === 'Pending');
  const failed = pods.filter(p => p.status === 'Failed' || p.status === 'CrashLoopBackOff');

  const tableHeaders = [
    { key: 'dot',       header: '' },
    { key: 'name',      header: 'Pod' },
    { key: 'namespace', header: 'Namespace' },
    { key: 'status',    header: '상태' },
    { key: 'node',      header: 'Node' },
    { key: 'actions',   header: '' },
  ];

  const tableRows = pods.map((p, i) => ({
    id:        String(i),
    dot:       p,           // full object — used for dot color rendering
    name:      p.name.replace('polyon-', ''),
    namespace: p.namespace || 'default',
    status:    p,           // full object — used for status badge rendering
    node:      p.nodeName || '—',
    actions:   p.name,      // pod name — used for action buttons
  }));

  return (
    <div style={{ padding: '0 32px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Pods & Services</h1>
          <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>PolyON Kubernetes Pod 상태</p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>새로고침</Button>
      </div>

      {loading ? (
        <InlineLoading description="Pod 목록 로딩 중..." />
      ) : error ? (
        <div style={{ color: 'var(--cds-support-error)', padding: '16px' }}>
          {error}
          {error.includes('404') && (
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              K8s API가 아직 구현되지 않았습니다.
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
            <span style={{ color: 'var(--cds-text-secondary)' }}>총 {pods.length}개 Pod</span>
            <span style={{ color: '#198038' }}>● {running.length} Running</span>
            {pending.length > 0 && <span style={{ color: '#f1c21b' }}>● {pending.length} Pending</span>}
            {failed.length > 0  && <span style={{ color: '#da1e28' }}>● {failed.length} Failed</span>}
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
                    const p = pods[ri];
                    const isRunning = p?.status === 'Running';
                    const isFailed  = p?.status === 'Failed' || p?.status === 'CrashLoopBackOff';
                    const dotColor  = isFailed ? '#da1e28' : isRunning ? '#198038' : '#f1c21b';
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
                          if (cell.info.header === 'namespace') {
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
                                <PodStatusBadge status={p?.status} />
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'node') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
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
          {logPod && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Pod {logPod} 로그</h4>
                <Button kind="ghost" size="sm" onClick={() => setLogPod(null)}>닫기</Button>
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
