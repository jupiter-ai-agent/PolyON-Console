// @ts-nocheck
import { useState } from 'react';
import { Tag, InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { StatusTag, InfoRow, GrafanaPanel, ManagerIframe } from './components/DatabaseShared';

export default function DatabaseRedisPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/databases/status');
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const rd = data?.redis || {};

  return (
    <div className="he-db-page">
      <div className="he-db-page__header">
        <div className="he-db-page__title-row">
          <h2 className="he-db-page__title">Redis</h2>
          <Tag size="sm" type="blue">Cache</Tag>
        </div>
        <p className="he-db-page__desc">redis-commander 매니저 및 서비스 상태 모니터링</p>
      </div>

      <div className="he-db-page__body">
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 1) fetchStatus(); }}>
          <TabList aria-label="Redis 탭" contained>
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
              <div className="he-db-status">
                {loading ? (
                  <InlineLoading description="로딩 중..." />
                ) : (
                  <>
                    <div className="he-db-card">
                      <div className="he-db-card__header">
                        <span className="he-db-card__name">Redis</span>
                        <StatusTag status={rd.status} />
                      </div>
                      <InfoRow label="버전" value={rd.version} />
                      <InfoRow label="Uptime" value={rd.uptime_human} />
                      <InfoRow label="메모리 사용" value={rd.memory_used} />
                      <InfoRow label="메모리 최대" value={rd.memory_peak} />
                      <InfoRow label="클라이언트" value={rd.connected_clients} />
                      <InfoRow label="키 개수" value={rd.total_keys} />
                    </div>

                    <div className="he-db-metrics">
                      <h4 className="he-db-metrics__title">Redis 메트릭</h4>
                      <div className="he-db-metrics__grid">
                        <GrafanaPanel uid="polyon-redis" slug="polyon-redis" panelId={10} title="Memory Usage" />
                        <GrafanaPanel uid="polyon-redis" slug="polyon-redis" panelId={11} title="Commands / sec" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
