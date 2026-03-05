// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Tile,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import { Globe, Document, BareMetalServer as Server } from "@carbon/icons-react";
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

interface SystemHealth {
  hostname?: string;
}

const SERVICE_URLS = [
  { label: 'PolyON UI',       url: 'http://localhost:8443' },
  { label: 'Keycloak',        url: 'http://localhost:8443/auth/' },
  { label: 'RustFS Console',  url: 'http://localhost:9001/rustfs/console/' },
  { label: 'Stalwart Admin',  url: 'http://localhost:8480' },
  { label: 'elasticvue',      url: 'http://localhost:8082' },
  { label: 'pgAdmin',         url: 'http://localhost:8443/pgadmin/' },
  { label: 'Grafana',         url: 'http://localhost:8443/grafana/' },
  { label: 'Prometheus',      url: 'http://localhost:8443/prometheus/' },
];

export default function SettingsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [domainInfo, setDomainInfo] = useState<{ domain?: string; netbios?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [h, d] = await Promise.all([
          settingsApi.getSystemHealth().catch(() => ({})) as Promise<SystemHealth>,
          settingsApi.getDomainInfo().catch(() => ({})),
        ]);
        setHealth(h);
        const info = (d as { data?: { domain?: string; netbios?: string } }).data || d as { domain?: string; netbios?: string };
        setDomainInfo(info);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="일반 설정"
        description="PolyON 플랫폼 기본 설정"
      />

      {error && (
        <InlineNotification
          kind="error"
          title="오류"
          subtitle={error}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Platform Info */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Server size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>플랫폼 정보</h4>
          </div>
          {loading ? (
            <SkeletonText paragraph lines={4} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 500 }}>플랫폼</span><span>PolyON v2</span>
              <span style={{ fontWeight: 500 }}>도메인</span>
              <span><code>{domainInfo?.domain || 'EXAMPLE.COM'}</code></span>
              <span style={{ fontWeight: 500 }}>NetBIOS</span>
              <span><code>{domainInfo?.netbios || 'EXAMPLE'}</code></span>
              <span style={{ fontWeight: 500 }}>배포 방식</span><span>Docker Compose</span>
              <span style={{ fontWeight: 500 }}>호스트</span>
              <span><code>{health?.hostname || window.location.hostname}</code></span>
            </div>
          )}
        </Tile>

        {/* Service URLs */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Globe size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>서비스 URL</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
            {SERVICE_URLS.map(s => (
              <>
                <span key={`lbl-${s.label}`} style={{ fontWeight: 500 }}>{s.label}</span>
                <a
                  key={`url-${s.label}`}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--cds-link-primary)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}
                >
                  {s.url}
                </a>
              </>
            ))}
          </div>
        </Tile>

        {/* Docs */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Document size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>빠른 링크</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: 0 }}>
            추가 설정은 좌측 메뉴의 각 항목에서 변경할 수 있습니다.
          </p>
        </Tile>
      </div>
    </>
  );
}
