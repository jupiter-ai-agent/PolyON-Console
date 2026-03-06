// @ts-nocheck
import {
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Button,
  Tag
} from '@carbon/react';
import { Copy } from '@carbon/icons-react';

function ServiceStatusTag({ status }: { status: string }) {
  if (status === 'Running') return <Tag type="green">Running</Tag>;
  if (status === 'Pending') return <Tag type="warm-gray">Pending</Tag>;
  if (status === 'Failed') return <Tag type="red">Failed</Tag>;
  return <Tag type="gray">Unknown</Tag>;
}

interface DatabaseConnectionCardProps {
  title: string;
  host: string;
  port: number;
  status: string;
  username?: string;
  database?: string;
  connectionString?: string;
  customFields?: { label: string; value: string; copyable?: boolean }[];
}

export function DatabaseConnectionCard({
  title,
  host,
  port,
  status,
  username,
  database,
  connectionString,
  customFields = []
}: DatabaseConnectionCardProps) {
  const copyToClipboard = (text: string) => {
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
          {customFields.map((field, index) => (
            <StructuredListRow key={index}>
              <StructuredListCell>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{field.label}</span>
              </StructuredListCell>
              <StructuredListCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                    {field.value}
                  </span>
                  {field.copyable && (
                    <Button 
                      kind="ghost" 
                      size="sm" 
                      hasIconOnly 
                      renderIcon={Copy} 
                      iconDescription="복사"
                      onClick={() => copyToClipboard(field.value)}
                    />
                  )}
                </div>
              </StructuredListCell>
            </StructuredListRow>
          ))}
          {connectionString && (
            <StructuredListRow>
              <StructuredListCell>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Connection String</span>
              </StructuredListCell>
              <StructuredListCell>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                    {connectionString}
                  </span>
                  <Button 
                    kind="ghost" 
                    size="sm" 
                    hasIconOnly 
                    renderIcon={Copy} 
                    iconDescription="복사"
                    onClick={() => copyToClipboard(connectionString)}
                  />
                </div>
              </StructuredListCell>
            </StructuredListRow>
          )}
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}