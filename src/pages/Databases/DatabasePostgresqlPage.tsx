// @ts-nocheck
import { useState, useEffect } from 'react';
import { 
  Tag, 
  InlineLoading, 
  Button, 
  StructuredListWrapper, 
  StructuredListHead, 
  StructuredListRow, 
  StructuredListCell, 
  StructuredListBody,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell
} from '@carbon/react';
import { Renew, Copy } from '@carbon/icons-react';

function ServiceStatusTag({ status }) {
  if (status === 'Running') return <Tag type="green">Running</Tag>;
  if (status === 'Pending') return <Tag type="warm-gray">Pending</Tag>;
  if (status === 'Failed') return <Tag type="red">Failed</Tag>;
  return <Tag type="gray">Unknown</Tag>;
}

function ConnectionCard({ title, host, port, status, username, database }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h4>
        <ServiceStatusTag status={status} />
      </div>
      
      <StructuredListWrapper>
        <StructuredListBody>
          <StructuredListRow>
            <StructuredListCell style={{ width: '120px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Host</span>
            </StructuredListCell>
            <StructuredListCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>{host}</span>
                <Button 
                  kind="ghost" 
                  size="sm" 
                  hasIconOnly 
                  renderIcon={Copy} 
                  iconDescription="복사"
                  onClick={() => copyToClipboard(host)}
                />
              </div>
            </StructuredListCell>
          </StructuredListRow>
          <StructuredListRow>
            <StructuredListCell>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Port</span>
            </StructuredListCell>
            <StructuredListCell>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>{port}</span>
            </StructuredListCell>
          </StructuredListRow>
          {username && (
            <StructuredListRow>
              <StructuredListCell>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Username</span>
              </StructuredListCell>
              <StructuredListCell>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>{username}</span>
              </StructuredListCell>
            </StructuredListRow>
          )}
          {database && (
            <StructuredListRow>
              <StructuredListCell>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Database</span>
              </StructuredListCell>
              <StructuredListCell>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>{database}</span>
              </StructuredListCell>
            </StructuredListRow>
          )}
          <StructuredListRow>
            <StructuredListCell>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Connection String</span>
            </StructuredListCell>
            <StructuredListCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  postgresql://{username}@{host}:{port}/{database}
                </span>
                <Button 
                  kind="ghost" 
                  size="sm" 
                  hasIconOnly 
                  renderIcon={Copy} 
                  iconDescription="복사"
                  onClick={() => copyToClipboard(`postgresql://${username}@${host}:${port}/${database}`)}
                />
              </div>
            </StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

export default function DatabasePostgresqlPage() {
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServiceStatus = async () => {
    setLoading(true);
    try {
      // K8s Service 정보를 가져옴 (API가 없으면 기본값 사용)
      const res = await fetch('/api/v1/services/postgresql');
      if (res.ok) {
        const data = await res.json();
        setServiceData(data);
      } else {
        // 기본 K8s Service 정보 (API 미구현 시)
        setServiceData({
          name: 'polyon-postgresql',
          namespace: 'default',
          clusterIP: '10.43.123.45',
          ports: [{ port: 5432, protocol: 'TCP' }],
          status: 'Running',
          endpoints: ['10.42.0.15:5432']
        });
      }
    } catch {
      // API 오류 시 기본값
      setServiceData({
        name: 'polyon-postgresql',
        namespace: 'default',
        clusterIP: '10.43.123.45',
        ports: [{ port: 5432, protocol: 'TCP' }],
        status: 'Unknown',
        endpoints: []
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServiceStatus();
  }, []);

  const refreshData = () => {
    fetchServiceStatus();
  };

  return (
    <div style={{ padding: '0 2rem 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0 1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>PostgreSQL</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: '0.25rem 0 0' }}>
            PostgreSQL 데이터베이스 서비스 연결 정보
          </p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={Renew} onClick={refreshData}>
          새로고침
        </Button>
      </div>

      {loading ? (
        <InlineLoading description="서비스 정보 로딩 중..." />
      ) : serviceData ? (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
          {/* K8s Service 연결 정보 */}
          <ConnectionCard
            title="PostgreSQL Service"
            host={serviceData.clusterIP}
            port={serviceData.ports?.[0]?.port || 5432}
            status={serviceData.status}
            username="postgres"
            database="polyon"
          />

          {/* Cluster IP */}
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              Kubernetes Service 정보
            </h4>
            
            <StructuredListWrapper>
              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell style={{ width: '120px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Service Name</span>
                  </StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>
                      {serviceData.name}
                    </span>
                  </StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Namespace</span>
                  </StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>
                      {serviceData.namespace}
                    </span>
                  </StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Cluster IP</span>
                  </StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>
                      {serviceData.clusterIP}
                    </span>
                  </StructuredListCell>
                </StructuredListRow>
                <StructuredListRow>
                  <StructuredListCell>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Endpoints</span>
                  </StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                      {serviceData.endpoints?.join(', ') || '정보 없음'}
                    </span>
                  </StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </StructuredListWrapper>
          </div>

          {/* 접속 방법 안내 */}
          <div style={{ background: '#f4f4f4', border: '1px solid var(--cds-border-subtle-00)', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
              접속 방법
            </h4>
            <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--cds-text-secondary)' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>kubectl로 접속:</strong>
              </p>
              <code style={{ background: '#262626', color: '#f4f4f4', padding: '0.5rem', display: 'block', fontSize: '0.75rem', marginBottom: '1rem' }}>
                kubectl exec -it deployment/polyon-postgresql -- psql -U postgres -d polyon
              </code>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>클러스터 내 Pod에서 접속:</strong>
              </p>
              <code style={{ background: '#262626', color: '#f4f4f4', padding: '0.5rem', display: 'block', fontSize: '0.75rem' }}>
                psql postgresql://postgres@{serviceData.clusterIP}:5432/polyon
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
          PostgreSQL 서비스 정보를 가져올 수 없습니다.
        </div>
      )}
    </div>
  );
}
