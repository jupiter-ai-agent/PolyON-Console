// @ts-nocheck
import {
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell
} from '@carbon/react';

interface ServiceInfoCardProps {
  serviceData: {
    name: string;
    namespace: string;
    clusterIP: string;
    ports?: { port: number; protocol: string }[];
    endpoints?: string[];
  };
}

export function ServiceInfoCard({ serviceData }: ServiceInfoCardProps) {
  return (
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
  );
}