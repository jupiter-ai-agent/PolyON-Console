// @ts-nocheck
import { useState, useEffect } from 'react';
import { 
  Tag, 
  InlineLoading, 
  Button, 
  StructuredListWrapper, 
  StructuredListRow, 
  StructuredListCell, 
  StructuredListBody
} from '@carbon/react';
import { Renew, Copy } from '@carbon/icons-react';

function ServiceStatusTag({ status }) {
  if (status === 'Running') return <Tag type="green">Running</Tag>;
  if (status === 'Pending') return <Tag type="warm-gray">Pending</Tag>;
  if (status === 'Failed') return <Tag type="red">Failed</Tag>;
  return <Tag type="gray">Unknown</Tag>;
}

function ConnectionCard({ title, host, port, status }) {
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
          <StructuredListRow>
            <StructuredListCell>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>REST API</span>
            </StructuredListCell>
            <StructuredListCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  http://{host}:{port}
                </span>
                <Button 
                  kind="ghost" 
                  size="sm" 
                  hasIconOnly 
                  renderIcon={Copy} 
                  iconDescription="복사"
                  onClick={() => copyToClipboard(`http://${host}:${port}`)}
                />
              </div>
            </StructuredListCell>
          </StructuredListRow>
          <StructuredListRow>
            <StructuredListCell>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Health Check</span>
            </StructuredListCell>
            <StructuredListCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  http://{host}:{port}/_cluster/health
                </span>
                <Button 
                  kind="ghost" 
                  size="sm" 
                  hasIconOnly 
                  renderIcon={Copy} 
                  iconDescription="복사"
                  onClick={() => copyToClipboard(`http://${host}:${port}/_cluster/health`)}
                />
              </div>
            </StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

export default function DatabaseElasticPage() {
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServiceStatus = async () => {
    setLoading(true);
    try {
      // K8s Service 정보를 가져옴 (API가 없으면 기본값 사용)
      const res = await fetch('/api/v1/services/elasticsearch');
      if (res.ok) {
        const data = await res.json();
        setServiceData(data);
      } else {
        // 기본 K8s Service 정보 (API 미구현 시)
        setServiceData({
          name: 'polyon-elasticsearch',
          namespace: 'default',
          clusterIP: '10.43.156.78',
          ports: [{ port: 9200, protocol: 'TCP' }],
          status: 'Running',
          endpoints: ['10.42.0.22:9200']
        });
      }
    } catch {
      // API 오류 시 기본값
      setServiceData({
        name: 'polyon-elasticsearch',
        namespace: 'default',
        clusterIP: '10.43.156.78',
        ports: [{ port: 9200, protocol: 'TCP' }],
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
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Elasticsearch</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: '0.25rem 0 0' }}>
            Elasticsearch 검색 엔진 서비스 연결 정보
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
            title="Elasticsearch Service"
            host={serviceData.clusterIP}
            port={serviceData.ports?.[0]?.port || 9200}
            status={serviceData.status}
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
                kubectl exec -it deployment/polyon-elasticsearch -- curl http://localhost:9200
              </code>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>클러스터 내 Pod에서 접속:</strong>
              </p>
              <code style={{ background: '#262626', color: '#f4f4f4', padding: '0.5rem', display: 'block', fontSize: '0.75rem', marginBottom: '1rem' }}>
                curl http://{serviceData.clusterIP}:9200/_cluster/health
              </code>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                <strong>인덱스 조회:</strong>
              </p>
              <code style={{ background: '#262626', color: '#f4f4f4', padding: '0.5rem', display: 'block', fontSize: '0.75rem' }}>
                curl http://{serviceData.clusterIP}:9200/_cat/indices?v
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
          Elasticsearch 서비스 정보를 가져올 수 없습니다.
        </div>
      )}
    </div>
  );
}