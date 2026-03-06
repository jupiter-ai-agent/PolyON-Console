// @ts-nocheck
import { useState } from 'react';
import { Tag, InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { StatusTag, InfoRow, GrafanaPanel, ManagerIframe } from './components/DatabaseShared';

export default function DatabasePostgresqlPage() {
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

  const pg = data?.postgresql || {};

  return (
    <div className="he-db-page">
      <div className="he-db-page__header">
        <div className="he-db-page__title-row">
          <h2 className="he-db-page__title">PostgreSQL</h2>
          <Tag type="blue">Database</Tag>
        </div>
        <p className="he-db-page__desc">pgweb 쿼리 매니저 및 서비스 상태 모니터링</p>
      </div>

      <div className="he-db-page__body">
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 1) fetchStatus(); }}>
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
              <div className="he-db-status">
                {loading ? (
                  <InlineLoading description="로딩 중..." />
                ) : (
                  <>
                    <div className="he-db-card">
                      <div className="he-db-card__header">
                        <span className="he-db-card__name">PostgreSQL</span>
                        <StatusTag status={pg.status} />
                      </div>
                      <InfoRow label="버전" value={pg.version} />
                      <InfoRow label="Uptime" value={pg.uptime} />
                      <InfoRow label="DB 크기" value={pg.size} />
                      <InfoRow label="연결 수" value={pg.connections} />
                      <InfoRow label="데이터베이스" value={(pg.databases || []).join(', ')} />
                    </div>

                    <div className="he-db-metrics">
                      <h4 className="he-db-metrics__title">PostgreSQL 메트릭</h4>
                      <div className="he-db-metrics__grid">
                        <GrafanaPanel uid="polyon-postgresql" slug="polyon-postgresql" panelId={10} title="Transactions / sec" />
                        <GrafanaPanel uid="polyon-postgresql" slug="polyon-postgresql" panelId={12} title="Cache Hit vs Read" />
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
