// @ts-nocheck
import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel, Tile } from '@carbon/react';
import { ManagerIframe } from './components/DatabaseShared';
import {
  Search,
  Activity,
  Group,
  Folder,
  Document,
  Meter,
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

export default function DatabaseElasticPage() {
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

  const statusNode = (() => {
    if (!data) return <InlineLoading description="" />;
    const status = es.cluster_status || es.status;
    if (status === 'green' || status === 'up' || status === 'online') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} /> 온라인</span>;
    if (status === 'red' || status === 'down' || status === 'offline') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ErrorFilled size={16} style={{ color: 'var(--cds-support-error)' }} /> 오프라인</span>;
    if (status === 'yellow') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 주의</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 불명</span>;
  })();

  return (
    <>
      <PageHeader
        title="Elasticsearch"
        description="Elasticvue 매니저 및 클러스터 상태 모니터링"
      />
      <div style={{ padding: '0 0 24px' }}>
        <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => { setSelectedTab(selectedIndex); if (selectedIndex === 1) fetchStatus(); }}>
          <TabList contained aria-label="Elasticsearch 탭">
            <Tab>Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="he-db-page__tab-panel--iframe">
              <ManagerIframe
                src="/elasticvue/"
                title="elasticvue"
                errorMessage="Elasticvue에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
                toolName="Elasticvue"
                toolDesc="Elasticsearch 웹 기반 관리 도구. 인덱스 관리, 쿼리 편집기, 클러스터 상태 모니터링을 지원합니다."
                toolUrl="https://github.com/cars10/elasticvue"
                onLoad={handleElasticvueLoad}
              />
            </TabPanel>
            <TabPanel>
              <div>
                {/* 통계 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <StatCard label="상태" value={statusNode} icon={<Search size={16} />} />
                  <StatCard label="버전" value={es.version ?? '—'} icon={<Activity size={16} />} loading={loading} />
                  <StatCard label="노드" value={es.nodes ?? '—'} icon={<Group size={16} />} loading={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <StatCard label="인덱스" value={es.indices_count ?? '—'} icon={<Folder size={16} />} loading={loading} />
                  <StatCard label="문서 수" value={es.docs_count ? es.docs_count.toLocaleString() : '—'} icon={<Document size={16} />} loading={loading} />
                  <StatCard label="저장소 크기" value={es.store_size ?? '—'} icon={<Meter size={16} />} loading={loading} />
                </div>

                {/* 클러스터 상세 정보 */}
                {es.cluster_name && (
                  <Tile style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>클러스터 정보</h3>
                    <div style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>
                      클러스터명: {es.cluster_name}
                    </div>
                  </Tile>
                )}

                {/* 안내 메시지 */}
                {data && (
                  <Tile>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>상세 메트릭</h3>
                    <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>
                      Elasticsearch 상세 메트릭은 Manager 탭의 Elasticvue 내장 모니터링을 이용하세요.
                    </p>
                  </Tile>
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
