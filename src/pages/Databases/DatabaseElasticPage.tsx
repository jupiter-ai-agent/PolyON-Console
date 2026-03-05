// @ts-nocheck
import { useState, useRef } from 'react';
import { Tag, InlineLoading, Tabs, TabList, Tab, TabPanels, TabPanel, Button } from '@carbon/react';
import { Renew } from '@carbon/icons-react';

function StatusTag({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'up' || s === 'green') return <Tag type="green">Running</Tag>;
  if (s === 'yellow') return <Tag type="teal">Degraded</Tag>;
  return <Tag type="red">Down</Tag>;
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
      <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace' }}>{value || 'N/A'}</span>
    </div>
  );
}

function ManagerIframe({ src, title, errorMessage }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef(null);

  const handleLoad = () => {
    setIframeLoaded(true);
    setIframeError(false);
    // Elasticvue 자동 클러스터 연결: /es-proxy 설정 주입
    if (src.includes('elasticvue')) {
      try {
        const iframeWin = iframeRef.current?.contentWindow;
        if (iframeWin) {
          const esUri = `${window.location.origin}/es-proxy`;
          const stored = iframeWin.localStorage.getItem('elasticvueClusters');
          if (!stored || stored === '[]' || stored === 'null') {
            const clusters = JSON.stringify([{ name: 'polyon', uri: esUri, status: 'unknown' }]);
            iframeWin.localStorage.setItem('elasticvueClusters', clusters);
            iframeWin.localStorage.setItem('elasticvueCluster', JSON.stringify({ name: 'polyon', uri: esUri }));
            iframeRef.current.src = src; // reload to pick up config
          }
        }
      } catch { /* cross-origin — ignore */ }
    }
  };

  const handleError = () => {
    setIframeLoaded(true);
    setIframeError(true);
  };

  const handleRetry = () => {
    setIframeLoaded(false);
    setIframeError(false);
    setKey(k => k + 1);
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 220px)', minHeight: '500px' }}>
      {!iframeLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cds-background)', zIndex: 1 }}>
          <InlineLoading description="로딩 중..." />
        </div>
      )}
      {iframeError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cds-background)', zIndex: 2, gap: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--cds-text-secondary)', margin: 0 }}>{errorMessage}</p>
          <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={handleRetry}>재시도</Button>
        </div>
      )}
      <iframe
        key={key}
        ref={iframeRef}
        src={src}
        frameBorder="0"
        loading="lazy"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default function DatabaseElasticPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/databases/status');
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
  };

  const es = data?.elasticsearch || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Elasticsearch</h2>
          <Tag size="sm">Database</Tag>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 1) fetchStatus(); }}>
          <TabList aria-label="Elasticsearch 탭">
            <Tab>Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels style={{ flex: 1, overflow: 'hidden' }}>
            <TabPanel style={{ padding: 0, height: '100%' }}>
              <ManagerIframe
                src="/elasticvue/"
                title="elasticvue"
                errorMessage="Elasticvue에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
              />
            </TabPanel>
            <TabPanel>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {loading ? <InlineLoading description="로딩 중..." /> : (
                  <>
                    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>Elasticsearch</span>
                        <StatusTag status={es.cluster_status || es.status} />
                      </div>
                      <Row label="버전" value={es.version} />
                      <Row label="클러스터" value={es.cluster_name} />
                      <Row label="노드" value={es.nodes} />
                      <Row label="인덱스" value={es.indices_count} />
                      <Row label="문서 수" value={(es.docs_count ?? 0).toLocaleString()} />
                      <Row label="저장소 크기" value={es.store_size} />
                    </div>
                    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
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
