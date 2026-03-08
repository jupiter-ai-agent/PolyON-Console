// @ts-nocheck
import { useState } from 'react';
import { InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel, Tile } from '@carbon/react';
import { GrafanaPanel, ManagerIframe } from './components/DatabaseShared';
import {
  DataBase,
  Time,
  Meter,
  Connect,
  Folder,
  Activity,
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

export default function DatabaseRedisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/databases/status');
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const rd = data?.redis || {};

  const statusNode = (() => {
    if (!data) return <InlineLoading description="" />;
    const status = rd.status;
    if (status === 'up' || status === 'online') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} /> 온라인</span>;
    if (status === 'down' || status === 'offline') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ErrorFilled size={16} style={{ color: 'var(--cds-support-error)' }} /> 오프라인</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 불명</span>;
  })();

  return (
    <>
      <PageHeader
        title="Redis"
        description="redis-commander 매니저 및 서비스 상태 모니터링"
      />
      <div style={{ padding: '0 0 24px' }}>
        <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => { setSelectedTab(selectedIndex); if (selectedIndex === 1) fetchStatus(); }}>
          <TabList contained aria-label="Redis 탭">
            <Tab>Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="he-db-page__tab-panel--iframe">
              <ManagerIframe
                src="/redis/"
                title="redis-commander"
                errorMessage="redis-commander에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
                toolName="redis-commander"
                toolDesc="Redis 웹 기반 관리 도구. 키 탐색, CLI, 실시간 모니터링을 지원합니다."
                toolUrl="https://github.com/joeferner/redis-commander"
              />
            </TabPanel>
            <TabPanel>
              <div>
                {/* 통계 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <StatCard label="상태" value={statusNode} icon={<DataBase size={16} />} />
                  <StatCard label="버전" value={rd.version ?? '—'} icon={<Activity size={16} />} loading={loading} />
                  <StatCard label="Uptime" value={rd.uptime_human ?? '—'} icon={<Time size={16} />} loading={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <StatCard label="메모리 사용" value={rd.memory_used ?? '—'} icon={<Meter size={16} />} loading={loading} />
                  <StatCard label="클라이언트" value={rd.connected_clients ?? '—'} icon={<Connect size={16} />} loading={loading} />
                  <StatCard label="키 개수" value={rd.total_keys ?? '—'} icon={<Folder size={16} />} loading={loading} />
                </div>

                {/* 메모리 상세 정보 */}
                {rd.memory_peak && (
                  <Tile style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>메모리 상세</h3>
                    <div style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>
                      최대 사용량: {rd.memory_peak}
                    </div>
                  </Tile>
                )}

                {/* Redis 메트릭 */}
                {data && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Redis 메트릭</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
                      <GrafanaPanel uid="polyon-redis" slug="polyon-redis" panelId={10} title="Memory Usage" />
                      <GrafanaPanel uid="polyon-redis" slug="polyon-redis" panelId={11} title="Commands / sec" />
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
