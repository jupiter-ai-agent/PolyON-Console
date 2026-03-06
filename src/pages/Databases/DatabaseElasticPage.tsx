// @ts-nocheck
import { useState } from 'react';
import { Tag, InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { StatusTag, InfoRow, ManagerIframe } from './components/DatabaseShared';

export default function DatabaseElasticPage() {
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

  const es = data?.elasticsearch || {};

  // Elasticvue 자동 클러스터 연결
  const handleElasticvueLoad = (iframe: HTMLIFrameElement) => {
    try {
      const iframeWin = iframe.contentWindow;
      if (iframeWin) {
        const esUri = `${window.location.origin}/es-proxy`;
        const stored = iframeWin.localStorage.getItem('elasticvueClusters');
        if (!stored || stored === '[]' || stored === 'null') {
          const clusters = JSON.stringify([{ name: 'polyon', uri: esUri, status: 'unknown' }]);
          iframeWin.localStorage.setItem('elasticvueClusters', clusters);
          iframeWin.localStorage.setItem('elasticvueCluster', JSON.stringify({ name: 'polyon', uri: esUri }));
          iframe.src = '/elasticvue/';
        }
      }
    } catch { /* cross-origin — ignore */ }
  };

  return (
    <div className="he-db-page">
      <div className="he-db-page__header">
        <div className="he-db-page__title-row">
          <h2 className="he-db-page__title">Elasticsearch</h2>
          <Tag size="sm" type="blue">Search</Tag>
        </div>
        <p className="he-db-page__desc">Elasticvue 매니저 및 클러스터 상태 모니터링</p>
      </div>

      <div className="he-db-page__body">
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 1) fetchStatus(); }}>
          <TabList aria-label="Elasticsearch 탭" contained>
            <Tab>Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="he-db-page__tab-panel--iframe">
              <ManagerIframe
                src="/elasticvue/"
                title="elasticvue"
                errorMessage="Elasticvue에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
                onLoad={handleElasticvueLoad}
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
                        <span className="he-db-card__name">Elasticsearch</span>
                        <StatusTag status={es.cluster_status || es.status} />
                      </div>
                      <InfoRow label="버전" value={es.version} />
                      <InfoRow label="클러스터" value={es.cluster_name} />
                      <InfoRow label="노드" value={es.nodes} />
                      <InfoRow label="인덱스" value={es.indices_count} />
                      <InfoRow label="문서 수" value={(es.docs_count ?? 0).toLocaleString()} />
                      <InfoRow label="저장소 크기" value={es.store_size} />
                    </div>

                    <div className="he-db-card he-db-card--info">
                      Elasticsearch 상세 메트릭은 Manager 탭의 Elasticvue 내장 모니터링을 이용하세요.
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
