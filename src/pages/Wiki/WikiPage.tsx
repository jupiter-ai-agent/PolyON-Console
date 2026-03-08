import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Button, Tag, InlineNotification,
  DataTableSkeleton
} from '@carbon/react';
import { Launch } from '@carbon/icons-react';

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

interface WikiStatus {
  status: string;
  version: string;
  engine: string;
  url: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e0e0e0', 
      padding: '1.25rem', 
      borderRadius: '4px' 
    }}>
      <div style={{ 
        fontSize: '0.6875rem', 
        fontWeight: 600, 
        textTransform: 'uppercase', 
        letterSpacing: '0.32px', 
        color: 'var(--cds-text-helper)' 
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '2rem', 
        fontWeight: 300, 
        marginTop: '0.5rem' 
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--cds-text-helper)', 
          marginTop: '0.25rem' 
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function WikiPage() {
  const [status, setStatus] = useState<WikiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await wikiFetch<WikiStatus>('/status');
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Wiki" description="지식 관리 · 위키 · 문서 협업" />
        <DataTableSkeleton headers={[]} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Wiki" description="지식 관리 · 위키 · 문서 협업" />
        <InlineNotification
          kind="error"
          title="위키 상태 조회 실패"
          subtitle={error}
        />
        <Button kind="tertiary" size="sm" onClick={fetchStatus} style={{ marginTop: '1rem' }}>
          재시도
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Wiki" 
        description="지식 관리 · 위키 · 문서 협업"
        actions={
          <Button
            kind="primary"
            renderIcon={Launch}
            onClick={() => window.open('https://wiki.cmars.com', '_blank')}
          >
            위키 열기
          </Button>
        }
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard
          label="엔진"
          value="AFFiNE"
          sub={status?.engine}
        />
        <StatCard
          label="버전"
          value={status?.version || 'N/A'}
        />
        <StatCard
          label="상태"
          value={status?.status === 'healthy' ? 'Healthy' : status?.status === 'down' ? 'Down' : 'Unknown'}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>시스템 정보</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Tag>OIDC 인증</Tag>
          <Tag>GraphQL API</Tag>
          <Tag>PostgreSQL</Tag>
          {status?.status === 'healthy' && <Tag type="green">온라인</Tag>}
        </div>
      </div>

      <InlineNotification
        kind="info"
        title="AFFiNE 위키"
        subtitle="OIDC 기반 인증으로 Keycloak SSO를 통해 로그인할 수 있습니다. 사용자는 첫 로그인 시 자동으로 생성됩니다."
        lowContrast
      />
    </>
  );
}