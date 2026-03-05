// @ts-nocheck
/**
 * Automation — n8n 워크플로우 자동화 개요
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tile,
  ClickableTile,
  SkeletonText,
  Tag,
  InlineNotification,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Activity, Code, DataShare } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { apiFetch } from '../../api/client';

const AUTO_BASE = '/engines/automation';

export default function AutomationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<string>('unknown');
  const [stats, setStats] = useState<any>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [statusRes, wfRes, exRes] = await Promise.all([
          apiFetch(`${AUTO_BASE}/status`).catch(() => ({ status: 'unknown' })),
          apiFetch(`${AUTO_BASE}/workflows`).catch(() => ({ workflows: [] })),
          apiFetch(`${AUTO_BASE}/executions?limit=10`).catch(() => ({ executions: [] })),
        ]);
        if (!mounted) return;
        setStatus(statusRes?.status || 'unknown');
        setStats(statusRes?.stats || null);
        setWorkflows(statusRes?.workflows || wfRes?.workflows || []);
        setExecutions(exRes?.executions || []);
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const statusColor = status === 'ok' ? 'green' : status === 'down' ? 'red' : 'gray';
  const statusLabel = status === 'ok' ? 'Online' : status === 'down' ? 'Offline' : 'Unknown';

  const wfStats = stats?.workflows || { total: 0, active: 0 };
  const exStats = stats?.executions || { total: 0, success: 0, failed: 0, running: 0 };

  return (
    <div style={{ margin: '-1.5rem -2rem 0' }}>
      <PageHeader
        title="Automation"
        description="n8n 워크플로우 자동화 엔진"
        icon={DataShare}
        hero
        heroColor="#005d5d"
      />

      <div style={{ padding: '1.5rem 2rem 2rem' }}>
        {error && (
          <InlineNotification
            kind="warning"
            title="연결 실패"
            subtitle="Automation 엔진에 연결할 수 없습니다."
            lowContrast
            hideCloseButton
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', marginBottom: '1.5rem' }}>
          {loading ? (
            [1,2,3,4].map(i => (
              <Tile key={i} style={{ background: '#fff' }}>
                <SkeletonText heading style={{ width: '60px' }} />
              </Tile>
            ))
          ) : (
            <>
              <Tile style={{ background: '#fff' }}>
                <p className="cds--label">엔진 상태</p>
                <Tag type={statusColor} size="sm">{statusLabel}</Tag>
              </Tile>
              <Tile style={{ background: '#fff' }}>
                <p className="cds--label">워크플로우</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: '4px 0' }}>{wfStats.total}</p>
                <p className="cds--label" style={{ color: 'var(--cds-text-secondary)' }}>{wfStats.active} active</p>
              </Tile>
              <Tile style={{ background: '#fff' }}>
                <p className="cds--label">실행 횟수</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: '4px 0' }}>{exStats.total}</p>
              </Tile>
              <Tile style={{ background: '#fff', borderLeft: exStats.failed > 0 ? '3px solid #da1e28' : undefined }}>
                <p className="cds--label">실패</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: '4px 0', color: exStats.failed > 0 ? '#da1e28' : undefined }}>{exStats.failed}</p>
              </Tile>
            </>
          )}
        </div>

        {/* Workflows */}
        <Tile style={{ background: '#fff', marginBottom: '1rem', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--cds-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>워크플로우</h4>
            <button className="cds--btn cds--btn--ghost cds--btn--sm" onClick={() => navigate('/automation/workflows')}>
              전체 보기
            </button>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            {loading ? <SkeletonText paragraph lineCount={3} /> :
             workflows.length === 0 ? (
              <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                등록된 워크플로우가 없습니다.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cds-border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>이름</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>상태</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>최근 실행</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.slice(0, 8).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{w.name || '—'}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <Tag type={w.active ? 'green' : 'gray'} size="sm">{w.active ? 'Active' : 'Inactive'}</Tag>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--cds-text-secondary)' }}>
                        {w.updatedAt ? new Date(w.updatedAt).toLocaleString('ko-KR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Tile>

        {/* Recent Executions */}
        <Tile style={{ background: '#fff', padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--cds-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 실행</h4>
            <button className="cds--btn cds--btn--ghost cds--btn--sm" onClick={() => navigate('/automation/executions')}>
              전체 보기
            </button>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            {loading ? <SkeletonText paragraph lineCount={3} /> :
             executions.length === 0 ? (
              <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                실행 이력이 없습니다.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cds-border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>워크플로우</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>상태</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>시작</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>종료</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((e: any, i: number) => {
                    const statusMap: Record<string, { type: string; label: string }> = {
                      success: { type: 'green', label: '성공' },
                      error: { type: 'red', label: '실패' },
                      crashed: { type: 'red', label: '크래시' },
                      running: { type: 'blue', label: '실행 중' },
                      waiting: { type: 'gray', label: '대기' },
                    };
                    const s = statusMap[e.status] || { type: 'gray', label: e.status || '—' };
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--cds-border-subtle)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>{e.workflow || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <Tag type={s.type} size="sm">{s.label}</Tag>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--cds-text-secondary)' }}>
                          {e.startedAt ? new Date(e.startedAt).toLocaleString('ko-KR') : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--cds-text-secondary)' }}>
                          {e.stoppedAt ? new Date(e.stoppedAt).toLocaleString('ko-KR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Tile>
      </div>
    </div>
  );
}
