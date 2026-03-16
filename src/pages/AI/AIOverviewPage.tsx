// @ts-nocheck
/**
 * AI Overview — LiteLLM Gateway 운영 대시보드
 * 모델 헬스, 실시간 비용, 사용량 로그를 한 화면에
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tag, InlineLoading, DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { Renew, Bot, Add } from '@carbon/icons-react';
import { aiApi } from '../../api/ai';
import { apiFetch } from '../../api/client';

/* ── 포맷 유틸 ── */
function fmtCost(n: number) {
  if (!n) return '$0.00';
  if (n < 0.01) return `$${(n * 1000).toFixed(3)}m`;  // milli-dollar
  return `$${n.toFixed(4)}`;
}
function fmtTokens(n: number) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
function fmtMs(ms: number) {
  if (!ms) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}
function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  return `${Math.floor(s / 3600)}시간 전`;
}

export default function AIOverviewPage() {
  const navigate = useNavigate();

  const [health,      setHealth]      = useState<any>(null);
  const [globalSpend, setGlobalSpend] = useState<any>(null);
  const [spendModels, setSpendModels] = useState<any[]>([]);
  const [logs,        setLogs]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, g, sm, lg] = await Promise.allSettled([
      apiFetch('/ai/health'),
      apiFetch('/ai/usage/global'),
      apiFetch('/ai/spend/models'),
      apiFetch('/ai/usage/logs'),
    ]);
    if (h.status === 'fulfilled') setHealth(h.value);
    if (g.status === 'fulfilled') setGlobalSpend(g.value);
    if (sm.status === 'fulfilled') setSpendModels(Array.isArray(sm.value) ? sm.value : []);
    if (lg.status === 'fulfilled') {
      const raw = lg.value as any;
      setLogs(Array.isArray(raw) ? raw.slice(0, 20) : (raw?.logs || []).slice(0, 20));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const healthyEndpoints: any[] = health?.healthy_endpoints || [];
  const unhealthyEndpoints: any[] = health?.unhealthy_endpoints || [];
  const allEndpoints = [
    ...healthyEndpoints.map(e => ({ ...e, _healthy: true })),
    ...unhealthyEndpoints.map(e => ({ ...e, _healthy: false })),
  ];

  const totalSpend   = globalSpend?.spend || 0;
  const totalTokens  = logs.reduce((s, l) => s + (l.total_tokens || 0), 0);
  const avgLatency   = logs.length
    ? logs.reduce((s, l) => s + (l.request_duration_ms || 0), 0) / logs.length
    : 0;

  /* ── 모델 헬스 테이블 ── */
  const modelHeaders = [
    { key: 'model',   header: '모델' },
    { key: 'status',  header: '상태' },
    { key: 'latency', header: '응답속도' },
  ];
  const modelRows = allEndpoints.map((e, i) => ({
    id: String(i),
    model:   <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}>{e.model || '—'}</code>,
    status:  e._healthy
      ? <Tag type="green">Healthy</Tag>
      : <Tag type="red">Unhealthy</Tag>,
    latency: fmtMs(e.avg_latency_ms),
  }));

  /* ── 모델별 비용 테이블 ── */
  const costHeaders = [
    { key: 'model', header: '모델' },
    { key: 'spend', header: '누적 비용' },
    { key: 'bar',   header: '' },
  ];
  const maxSpend = Math.max(...spendModels.map(m => m.total_spend || 0), 0.000001);
  const costRows = spendModels.map((m, i) => ({
    id: String(i),
    model: <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}>{m.model}</code>,
    spend: <strong>{fmtCost(m.total_spend)}</strong>,
    bar: (
      <div style={{ height: 8, background: 'var(--cds-layer-02)', borderRadius: 4, minWidth: 80 }}>
        <div style={{
          height: 8, borderRadius: 4, background: '#0f62fe',
          width: `${Math.min((m.total_spend / maxSpend) * 100, 100)}%`,
        }} />
      </div>
    ),
  }));

  /* ── 사용 로그 테이블 ── */
  const logHeaders = [
    { key: 'time',    header: '시간' },
    { key: 'model',   header: '모델' },
    { key: 'tokens',  header: '토큰' },
    { key: 'latency', header: '응답속도' },
    { key: 'cost',    header: '비용' },
  ];
  const logRows = logs.map((l, i) => ({
    id: String(i),
    time:    <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem' }}>{timeAgo(l.startTime || l.created_at || '')}</span>,
    model:   <code style={{ fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>{l.model || '—'}</code>,
    tokens:  fmtTokens(l.total_tokens || 0),
    latency: fmtMs(l.request_duration_ms || 0),
    cost:    fmtCost(l.spend || 0),
  }));

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>AI Gateway</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            LiteLLM — 모델 헬스 · 비용 · 사용량 대시보드
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" hasIconOnly renderIcon={Renew} iconDescription="새로고침" onClick={load} />
          <Button kind="tertiary" renderIcon={Bot} onClick={() => navigate('/ai/models')}>모델 관리</Button>
          <Button kind="primary" renderIcon={Add} onClick={() => navigate('/ai/keys')}>API 키 발급</Button>
        </div>
      </div>

      {loading ? <InlineLoading description="AI Gateway 상태 로딩 중..." /> : (
        <>
          {/* ── KPI 카드 4개 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              {
                label: '등록 모델',
                value: String(allEndpoints.length),
                sub: `${healthyEndpoints.length} healthy`,
                accent: healthyEndpoints.length === allEndpoints.length ? '#24a148' : '#da1e28',
              },
              {
                label: '누적 비용 (총)',
                value: fmtCost(totalSpend),
                sub: `${spendModels.length}개 모델 사용`,
                accent: '#0f62fe',
              },
              {
                label: '세션 총 토큰',
                value: fmtTokens(totalTokens),
                sub: `최근 ${logs.length}건 기준`,
                accent: '#6929c4',
              },
              {
                label: '평균 응답속도',
                value: fmtMs(avgLatency),
                sub: `최근 ${logs.length}건 평균`,
                accent: '#0043ce',
              },
            ].map(card => (
              <div key={card.label} style={{
                background: 'var(--cds-layer-01)',
                border: '1px solid var(--cds-border-subtle-00)',
                borderTop: `3px solid ${card.accent}`,
                padding: '16px 20px',
              }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)', marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 300, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 6 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── 2열 레이아웃 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

            {/* 모델 헬스 */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>모델 상태</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Tag type="green">{healthyEndpoints.length} Healthy</Tag>
                  {unhealthyEndpoints.length > 0 && <Tag type="red">{unhealthyEndpoints.length} Down</Tag>}
                </div>
              </div>
              {modelRows.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>
                  등록된 모델 없음 —{' '}
                  <span style={{ color: 'var(--cds-link-primary)', cursor: 'pointer' }} onClick={() => navigate('/ai/models')}>
                    모델 등록하기
                  </span>
                </div>
              ) : (
                <DataTable rows={modelRows} headers={modelHeaders}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} size="sm">
                      <TableHead>
                        <TableRow>
                          {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => <TableCell key={cell.id}>{cell.value}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              )}
            </div>

            {/* 모델별 비용 */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>모델별 비용</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>총 {fmtCost(totalSpend)}</span>
              </div>
              {costRows.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>
                  사용 기록 없음
                </div>
              ) : (
                <DataTable rows={costRows} headers={costHeaders}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} size="sm">
                      <TableHead>
                        <TableRow>
                          {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => <TableCell key={cell.id}>{cell.value}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              )}
            </div>
          </div>

          {/* ── 사용 로그 ── */}
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--cds-border-subtle-00)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>최근 사용 로그</span>
              <Button kind="ghost" size="sm" onClick={() => navigate('/ai/usage')}>전체 보기</Button>
            </div>
            {logRows.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>
                사용 로그 없음
              </div>
            ) : (
              <DataTable rows={logRows} headers={logHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map(cell => <TableCell key={cell.id}>{cell.value}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>
        </>
      )}
    </div>
  );
}
