import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Button, InlineNotification, DataTableSkeleton, Tile, Tag
} from '@carbon/react';
import { Renew, Launch } from '@carbon/icons-react';

const BASE = '/api/v1/engines/wiki';

async function wikiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface WikiInfo {
  version: string;
  engine: string;
}

interface WikiStatus {
  status: string;
  version: string;
  engine: string;
  url: string;
}

export default function WikiSettingsPage() {
  const [status, setStatus] = useState<WikiStatus | null>(null);
  const [info, setInfo] = useState<WikiInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, infoData] = await Promise.all([
        wikiFetch<WikiStatus>('/status'),
        wikiFetch<WikiInfo>('/info')
      ]);
      setStatus(statusData);
      setInfo(infoData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="설정" description="위키 시스템 설정" />
        <DataTableSkeleton headers={[]} />
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="설정" 
        description="위키 시스템 설정"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              kind="secondary"
              renderIcon={Renew}
              onClick={fetchData}
              disabled={loading}
            >
              새로고침
            </Button>
            <Button
              kind="primary"
              renderIcon={Launch}
              onClick={() => window.open('https://wiki.cmars.com', '_blank')}
            >
              위키 열기
            </Button>
          </div>
        }
      />

      {error && (
        <div style={{ marginBottom: '2rem' }}>
          <InlineNotification
            kind="error"
            title="설정 정보 조회 실패"
            subtitle={error}
          />
          <Button kind="tertiary" size="sm" onClick={fetchData} style={{ marginTop: '1rem' }}>
            재시도
          </Button>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* AFFiNE 상태 */}
        <Tile>
          <h4 style={{ marginBottom: '1rem' }}>AFFiNE 상태</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>상태</span>
              <span>{status?.status === 'healthy' ? 'Healthy' : status?.status === 'down' ? 'Down' : 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>버전</span>
              <span>{status?.version || info?.version || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>엔진</span>
              <span>{status?.engine || info?.engine || 'affine'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>URL</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {status?.url || 'http://polyon-wiki:3010'}
              </span>
            </div>
          </div>
        </Tile>

        {/* OIDC 연동 상태 */}
        <Tile>
          <h4 style={{ marginBottom: '1rem' }}>OIDC 연동 상태</h4>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <Tag type="green">Keycloak 연동</Tag>
              <Tag type="blue">자동 프로비저닝</Tag>
              <Tag>GraphQL API</Tag>
            </div>
            <p style={{ 
              color: 'var(--cds-text-secondary)', 
              lineHeight: '1.5',
              marginBottom: '1rem'
            }}>
              AFFiNE은 Keycloak OIDC를 통해 SSO 인증을 지원합니다. 
              사용자는 첫 로그인 시 자동으로 생성되며 별도의 LDAP 동기화가 불필요합니다.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Realm</span>
              <span>helios</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Client ID</span>
              <span>affine</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Redirect URI</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                https://wiki.cmars.com/*
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Web Origin</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                https://wiki.cmars.com
              </span>
            </div>
          </div>
        </Tile>

        {/* 시스템 정보 */}
        <Tile>
          <h4 style={{ marginBottom: '1rem' }}>시스템 정보</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>데이터베이스</span>
              <span>PostgreSQL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>DB 이름</span>
              <span>affine</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>포트</span>
              <span>3010</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Health Check</span>
              <span>/info</span>
            </div>
          </div>
        </Tile>

        <InlineNotification
          kind="info"
          title="설정 변경"
          subtitle="AFFiNE 설정은 Kubernetes manifest나 환경변수를 통해 변경할 수 있습니다. OIDC 관련 설정은 Keycloak Admin Console에서 관리하세요."
          lowContrast
        />
      </div>
    </>
  );
}