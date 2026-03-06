// @ts-nocheck
/**
 * Database 페이지 공통 컴포넌트 (IBM Cloud 스타일)
 */
import { useState, useRef } from 'react';
import { Tag, InlineLoading, Button } from '@carbon/react';
import { Renew } from '@carbon/icons-react';

/* ── Status Tag ── */
export function StatusTag({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'up' || s === 'green' || s === 'running') return <Tag type="green" size="sm">Running</Tag>;
  if (s === 'yellow' || s === 'degraded') return <Tag type="teal" size="sm">Degraded</Tag>;
  if (s === 'down' || s === 'red' || s === 'failed') return <Tag type="red" size="sm">Down</Tag>;
  return <Tag type="gray" size="sm">Unknown</Tag>;
}

/* ── Key-Value Row ── */
export function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="he-db-row">
      <span className="he-db-row__label">{label}</span>
      <span className="he-db-row__value">{value ?? 'N/A'}</span>
    </div>
  );
}

/* ── Grafana Embedded Panel ── */
export function GrafanaPanel({ uid, slug, panelId, title }: { uid: string; slug: string; panelId: number; title: string }) {
  const src = `/grafana/d-solo/${uid}/${slug}?orgId=1&panelId=${panelId}&from=now-1h&to=now&theme=light&kiosk`;
  return (
    <div className="he-db-grafana">
      <div className="he-db-grafana__header">{title}</div>
      <div className="he-db-grafana__body">
        <iframe src={src} frameBorder="0" loading="lazy" style={{ width: '100%', height: '100%', border: 'none' }} title={title} />
      </div>
    </div>
  );
}

/* ── Manager Iframe (pgweb / redis-commander / elasticvue) ── */
export function ManagerIframe({ src, title, errorMessage, onLoad }: {
  src: string;
  title: string;
  errorMessage: string;
  onLoad?: (iframeRef: HTMLIFrameElement) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
    if (onLoad && iframeRef.current) onLoad(iframeRef.current);
  };

  const handleError = () => {
    setLoaded(true);
    setError(true);
  };

  const handleRetry = () => {
    setLoaded(false);
    setError(false);
    setKey(k => k + 1);
  };

  return (
    <div className="he-db-iframe">
      {!loaded && (
        <div className="he-db-iframe__overlay">
          <InlineLoading description="로딩 중..." />
        </div>
      )}
      {error && (
        <div className="he-db-iframe__overlay he-db-iframe__overlay--error">
          <p className="he-db-iframe__error-text">{errorMessage}</p>
          <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={handleRetry}>재시도</Button>
        </div>
      )}
      <iframe
        key={key}
        ref={iframeRef}
        src={src}
        frameBorder="0"
        loading="lazy"
        className="he-db-iframe__frame"
        allow="clipboard-read; clipboard-write"
        title={title}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
