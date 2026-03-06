// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import {
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Tag, Button,
  DataTable,
  TableContainer, Table, TableHead, TableRow, TableHeader,
  TableBody, TableCell,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

const API = '/api/v1/sentinel';

function fmtDate(ts: string | number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function LevelBadge({ level }: { level: string }) {
  const upper = (level || '').toUpperCase();
  const typeMap: Record<string, string> = {
    INFO:     'blue',
    WARN:     'teal',
    WARNING:  'teal',
    CRITICAL: 'red',
    ERROR:    'red',
  };
  return <Tag type={typeMap[upper] || 'gray'}>{level || '—'}</Tag>;
}

function StatusResultBadge({ status }: { status: string }) {
  const lower = (status || '').toLowerCase();
  const typeMap: Record<string, string> = {
    ok:       'green',
    warning:  'teal',
    critical: 'red',
    error:    'red',
  };
  const labelMap: Record<string, string> = {
    ok:       '정상',
    warning:  '경고',
    critical: '위험',
    error:    '오류',
  };
  return (
    <Tag type={typeMap[lower] || 'gray'}>
      {labelMap[lower] || status || '—'}
    </Tag>
  );
}

/* ── Tab 1: 개요 ── */
function OverviewTab({ refreshKey }: { refreshKey: number }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [container, setContainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes, cRes, conRes] = await Promise.all([
        fetch(`${API}/alerts?limit=50`),
        fetch(`${API}/stats`),
        fetch(`${API}/config`),
        fetch(`${API}/container`),
      ]);
      if (aRes.ok) {
        const d = await aRes.json();
        setAlerts(d.alerts || d.items || []);
      }
      if (sRes.ok) setStats(await sRes.json());
      if (cRes.ok) setConfig(await cRes.json());
      if (conRes.ok) setContainer(await conRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const clearInfo = async () => {
    try {
      await fetch(`${API}/alerts?level=INFO`, { method: 'DELETE' });
      load();
    } catch { /* ignore */ }
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem',
  };

  /* ── Config 테이블 rows ── */
  const configRows = config ? [
    { id: 'model',    key: '모델',      value: config.model || config.llm_model || '—' },
    { id: 'interval', key: '분석 주기', value: config.interval_minutes ? `${config.interval_minutes}분` : '—' },
    { id: 'maxAlert', key: '최대 알림', value: String(config.max_alerts ?? '—') },
    { id: 'channel',  key: '알림 채널', value: config.notification_channel || '—' },
  ] : [];

  const configHeaders = [
    { key: 'key',   header: '항목' },
    { key: 'value', header: '값'   },
  ];

  /* ── Container 테이블 rows ── */
  const containerRows = container ? [
    { id: 'name',    key: '컨테이너',   value: container.name || 'sentinel' },
    { id: 'status',  key: '상태',       value: container.status || '—' },
    { id: 'uptime',  key: '업타임',     value: container.uptime || '—' },
    { id: 'lastRun', key: '마지막 실행', value: fmtDate(container.last_run || container.last_check) },
  ] : [];

  /* ── Alerts 테이블 ── */
  const alertHeaders = [
    { key: 'level',     header: '레벨'   },
    { key: 'timestamp', header: '시간'   },
    { key: 'service',   header: '서비스' },
    { key: 'message',   header: '메시지' },
  ];
  const alertRows = alerts.map((a, i) => ({
    id: String(i),
    level:     a.level,
    timestamp: fmtDate(a.timestamp || a.created_at),
    service:   a.service || a.source || '—',
    message:   a.message || a.summary || '—',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0' }}>
        {[
          { label: 'CRITICAL', value: stats?.critical ?? '—', color: '#da1e28' },
          { label: 'WARNING',  value: stats?.warn ?? stats?.warning ?? '—', color: '#8a6d00' },
          { label: 'INFO',     value: stats?.info ?? '—', color: '#0043ce' },
          { label: '전체',     value: stats?.total ?? alerts.length, color: '#525252' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: s.color }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Config + Container */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* LLM 구성 */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>LLM 구성</h4>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {loading ? (
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
            ) : !config ? (
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>구성 정보 없음</div>
            ) : (
              <DataTable rows={configRows} headers={configHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map(h => (
                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            )}
          </div>
        </div>

        {/* 컨테이너 상태 */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>컨테이너 상태</h4>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {loading ? (
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
            ) : !container ? (
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>컨테이너 정보 없음</div>
            ) : (
              <DataTable rows={containerRows} headers={configHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map(h => (
                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            )}
          </div>
        </div>
      </div>

      {/* Alerts table */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 알림</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button kind="ghost" onClick={load}>새로고침</Button>
            <Button kind="ghost" onClick={clearInfo}>INFO 정리</Button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>알림 없음</div>
        ) : (
          <DataTable rows={alertRows} headers={alertHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map(h => (
                        <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map(cell => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'level' ? (
                              <LevelBadge level={cell.value} />
                            ) : cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </div>
    </div>
  );
}

/* ── Tab 2: 임계값 ── */
function ThresholdsTab({ refreshKey }: { refreshKey: number }) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/config`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setConfig(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const thresholds = config?.thresholds || config?.alert_thresholds || {};

  const thresholdHeaders = [
    { key: 'item',     header: '항목'     },
    { key: 'warning',  header: '경고 기준' },
    { key: 'critical', header: '위험 기준' },
  ];
  const thresholdRows = Object.entries(thresholds).map(([key, val]: any) => ({
    id: key,
    item:     key,
    warning:  String(val?.warning ?? val?.warn ?? '—'),
    critical: String(val?.critical ?? '—'),
  }));

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>알림 임계값</h4>
      </div>
      <div style={{ padding: '1.25rem' }}>
        {loading ? (
          <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
        ) : thresholdRows.length === 0 ? (
          <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>임계값 구성 없음</div>
        ) : (
          <DataTable rows={thresholdRows} headers={thresholdHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map(h => (
                        <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map(cell => (
                          <TableCell
                            key={cell.id}
                            style={cell.info.header === 'critical' ? { color: '#da1e28' } : undefined}
                          >
                            {cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </div>
    </div>
  );
}

/* ── Tab 3: 분석 이력 ── */
function HistoryTab({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/events`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || d.events || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const historyHeaders = [
    { key: 'timestamp',      header: '시간'    },
    { key: 'result',         header: '상태'    },
    { key: 'summary',        header: '요약'    },
    { key: 'alerts_created', header: '생성 알림' },
  ];
  const historyRows = items.map((ev, i) => ({
    id:             String(i),
    timestamp:      fmtDate(ev.timestamp || ev.created_at),
    result:         ev.result || ev.status || 'unknown',
    summary:        ev.summary || ev.message || '—',
    alerts_created: String(ev.alerts_created ?? ev.alert_count ?? '—'),
  }));

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>분석 이력</h4>
        <Button kind="ghost" onClick={load}>새로고침</Button>
      </div>
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>분석 이력 없음</div>
      ) : (
        <DataTable rows={historyRows} headers={historyHeaders}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map(cell => (
                        <TableCell key={cell.id}>
                          {cell.info.header === 'result' ? (
                            <StatusResultBadge status={cell.value} />
                          ) : cell.value}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function SentinelPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentStatus, setAgentStatus] = useState<string>('unknown');

  useEffect(() => {
    fetch(`${API}/status`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setAgentStatus(d.status === 'running' || d.status === 'ok' ? 'healthy' : 'down');
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <PageHeader
        title="Sentinel Agent"
        description="AI 종합 상태 분석 — LLM이 시스템 전체를 주기적으로 점검하고 이상 징후를 판단합니다"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={agentStatus as any} />
            <Button kind="ghost" onClick={() => setRefreshKey(k => k + 1)}>새로고침</Button>
          </div>
        }
      />

      <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}>
        <TabList contained aria-label="Sentinel 탭">
          <Tab>개요</Tab>
          <Tab>알림 임계값</Tab>
          <Tab>분석 이력</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <OverviewTab refreshKey={refreshKey} />
          </TabPanel>
          <TabPanel>
            <ThresholdsTab refreshKey={refreshKey} />
          </TabPanel>
          <TabPanel>
            <HistoryTab refreshKey={refreshKey} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}
