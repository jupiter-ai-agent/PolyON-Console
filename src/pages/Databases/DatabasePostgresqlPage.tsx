// @ts-nocheck
import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel, Tile } from '@carbon/react';
import { GrafanaPanel, ManagerIframe } from './components/DatabaseShared';
import {
  DataBase,
  Activity,
  Connect,
  Time,
  Folder,
  Group,
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

// ── 통계 카드 ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Tile style={{ minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cds-text-secondary)', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 300 }}>
        {loading ? <InlineLoading description="" style={{ display: 'inline-flex' }} /> : value}
      </div>
    </Tile>
  );
}

export default function DatabasePostgresqlPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/databases/status') as any;
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const pg = data?.postgresql || {};

  const statusNode = (() => {
    if (!data) return <InlineLoading description="" />;
    const status = pg.status;
    if (status === 'up' || status === 'online') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} /> 온라인</span>;
    if (status === 'down' || status === 'offline') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ErrorFilled size={16} style={{ color: 'var(--cds-support-error)' }} /> 오프라인</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 불명</span>;
  })();

  return (
    <>
      <PageHeader
        title="PostgreSQL"
        description="pgweb 쿼리 매니저 및 서비스 상태 모니터링"
      />
      <div style={{ padding: '0 0 24px' }}>
        <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => { setSelectedTab(selectedIndex); if (selectedIndex === 1) fetchStatus(); }}>
          <TabList contained aria-label="PostgreSQL 탭">
            <Tab>Query Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="he-db-page__tab-panel--iframe">
              <ManagerIframe
                src="/pgweb/"
                title="pgweb"
                errorMessage="pgweb에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
                toolName="pgweb"
                toolDesc="PostgreSQL 웹 기반 쿼리 매니저. SQL 편집기, 테이블 뷰어, 데이터 내보내기를 지원합니다."
                toolUrl="https://github.com/sosedoff/pgweb"
              />
            </TabPanel>
            <TabPanel>
              <div>
                {/* 통계 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <StatCard label="상태" value={statusNode} icon={<DataBase size={16} />} />
                  <StatCard label="버전" value={pg.version ?? '—'} icon={<Activity size={16} />} loading={loading} />
                  <StatCard label="Uptime" value={pg.uptime ?? '—'} icon={<Time size={16} />} loading={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <StatCard label="DB 크기" value={pg.size ?? '—'} icon={<Folder size={16} />} loading={loading} />
                  <StatCard label="연결 수" value={pg.connections ?? '—'} icon={<Connect size={16} />} loading={loading} />
                  <StatCard label="데이터베이스" value={pg.databases ? `${pg.databases.length}개` : '—'} icon={<Group size={16} />} loading={loading} />
                </div>

                {/* 데이터베이스 목록 */}
                {pg.databases && pg.databases.length > 0 && (
                  <Tile style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>데이터베이스 목록</h3>
                    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {pg.databases.join(', ')}
                    </div>
                  </Tile>
                )}

                {/* PostgreSQL 메트릭 */}
                {data && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>PostgreSQL 메트릭</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
                      <GrafanaPanel uid="polyon-postgresql" slug="polyon-postgresql" panelId={10} title="Transactions / sec" />
                      <GrafanaPanel uid="polyon-postgresql" slug="polyon-postgresql" panelId={12} title="Cache Hit vs Read" />
                    </div>
                  </div>
                )}

                {!data && !loading && (
                  <p style={{ color: 'var(--cds-text-helper)' }}>Status 탭을 클릭하면 정보를 로드합니다.</p>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
}
