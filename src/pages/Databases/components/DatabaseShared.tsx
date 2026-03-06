// @ts-nocheck
/**
 * Database 페이지 공통 컴포넌트 (IBM Cloud 스타일)
 */
import { useState, useRef, useEffect } from 'react';
import { Tag, InlineLoading, Button } from '@carbon/react';
import { Renew, Launch, DataBase } from '@carbon/icons-react';

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

/* ── Not Deployed Placeholder ── */
function NotDeployed({ toolName, toolDesc, toolUrl }: { toolName: string; toolDesc: string; toolUrl?: string }) {
  return (
    <div className="he-db-not-deployed">
      <div className="he-db-not-deployed__icon">
        <DataBase size={48} />
      </div>
      <h3 className="he-db-not-deployed__title">{toolName}</h3>
      <p className="he-db-not-deployed__desc">{toolDesc}</p>
      <p className="he-db-not-deployed__hint">
        이 도구는 아직 배포되지 않았습니다.<br />
        Operator에서 관리 도구(Phase 4)를 설치하면 자동으로 활성화됩니다.
      </p>
      {toolUrl && (
        <Button kind="tertiary" size="sm" renderIcon={Launch} href={toolUrl} target="_blank">
          {toolName} 프로젝트 사이트
        </Button>
      )}
    </div>
  );
}

/* ── Manager Iframe (pgweb / redis-commander / elasticvue) ── */
export function ManagerIframe({ src, title, errorMessage, toolName, toolDesc, toolUrl, onLoad }: {
  src: string;
  title: string;
  errorMessage: string;
  toolName: string;
  toolDesc: string;
  toolUrl?: string;
  onLoad?: (iframeRef: HTMLIFrameElement) => void;
}) {
  const [state, setState] = useState<'checking' | 'available' | 'not-deployed' | 'error'>('checking');
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 서비스 가용성 확인: fetch로 응답 체크
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(src, { cache: 'no-cache' });
        if (cancelled) return;
        // 502/503/504 = 업스트림(polyon-tools) 미배포
        if (!res.ok) {
          setState('not-deployed');
          return;
        }
        const text = await res.text();
        if (cancelled) return;
        // SPA fallback이면 index.html 반환 — <div id="root"> 포함
        if (text.includes('<div id="root">') || text.includes('/assets/index-') || text.includes('ui-react')) {
          setState('not-deployed');
        } else {
          setState('available');
        }
      } catch {
        if (!cancelled) setState('not-deployed');
      }
    };
    setState('checking');
    check();
    return () => { cancelled = true; };
  }, [src, key]);

  const handleLoad = () => {
    if (onLoad && iframeRef.current) onLoad(iframeRef.current);
  };

  const handleRetry = () => {
    setKey(k => k + 1);
  };

  if (state === 'checking') {
    return (
      <div className="he-db-iframe">
        <div className="he-db-iframe__overlay">
          <InlineLoading description="서비스 확인 중..." />
        </div>
      </div>
    );
  }

  if (state === 'not-deployed') {
    return (
      <div className="he-db-iframe">
        <NotDeployed toolName={toolName} toolDesc={toolDesc} toolUrl={toolUrl} />
        <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem' }}>
          <Button kind="ghost" size="sm" renderIcon={Renew} onClick={handleRetry}>재확인</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="he-db-iframe">
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
        onError={() => setState('error')}
      />
    </div>
  );
}
