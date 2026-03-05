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

function GrafanaPanel({ panelId, title }) {
  const uid = 'polyon-redis';
  const slug = 'polyon-redis';
  const src = `/grafana/d-solo/${uid}/${slug}?orgId=1&panelId=${panelId}&from=now-1h&to=now&theme=light&kiosk`;
  return (
    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
      <div style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-secondary)', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>{title}</div>
      <div style={{ position: 'relative', height: '180px' }}>
        <iframe src={src} frameBorder="0" loading="lazy" style={{ width: '100%', height: '100%', border: 'none' }} title={title} />
      </div>
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
        allow="clipboard-read; clipboard-write"
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default function DatabaseRedisPage() {
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

  const rd = data?.redis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Redis</h2>
          <Tag size="sm">Database</Tag>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 1) fetchStatus(); }}>
          <TabList aria-label="Redis 탭">
            <Tab>Manager</Tab>
            <Tab>Status</Tab>
          </TabList>
          <TabPanels style={{ flex: 1, overflow: 'hidden' }}>
            <TabPanel style={{ padding: 0, height: '100%' }}>
              <ManagerIframe
                src="/redis/"
                title="redis-commander"
                errorMessage="redis-commander에 연결할 수 없습니다. 컨테이너가 실행 중인지 확인하세요."
              />
            </TabPanel>
            <TabPanel>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {loading ? <InlineLoading description="로딩 중..." /> : (
                  <>
                    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>Redis</span>
                        <StatusTag status={rd.status} />
                      </div>
                      <Row label="버전" value={rd.version} />
                      <Row label="Uptime" value={rd.uptime_human} />
                      <Row label="메모리 사용" value={rd.memory_used} />
                      <Row label="메모리 최대" value={rd.memory_peak} />
                      <Row label="클라이언트" value={rd.connected_clients} />
                      <Row label="키 개수" value={rd.total_keys} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px', margin: '0 0 12px' }}>Redis 메트릭</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <GrafanaPanel panelId={10} title="Memory Usage" />
                        <GrafanaPanel panelId={11} title="Commands / sec" />
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
