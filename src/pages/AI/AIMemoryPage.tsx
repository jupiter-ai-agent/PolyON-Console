import { useEffect, useState } from 'react';
import { PageHeader }  from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { aiApi }       from '../../api/ai';
import type { MemoryStats } from '../../api/ai';

export default function AIMemoryPage() {
  const [stats,   setStats]   = useState<MemoryStats>({ status: 'unknown', count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiApi.getMemoryStats()
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem',
  };

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem 1.5rem', lineHeight: 1.8, fontSize: '0.8125rem', borderBottom: '1px solid #f4f4f4', padding: '4px 0' }}>
      <span style={{ color: 'var(--cds-text-helper)', fontWeight: 600 }}>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <>
      <PageHeader title="AI Memory" description="Mem0 vector memory store status" />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Mem0 Status
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <StatusBadge status={stats.status as 'healthy' | 'down' | 'unknown' | 'warning'} />
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Stored Memories
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                {(stats.count || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>Memories</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Backend
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.5rem' }}>Mem0</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                polyon-mem0:8080
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Vector DB
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.5rem' }}>Qdrant</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>Embedded vector store</div>
            </div>
          </div>

          <SectionCard title="Memory Architecture">
            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              <InfoRow label="API Endpoint" value={
                <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                  http://polyon-mem0:8080/v1/memories/
                </code>
              } />
              <InfoRow label="Used by Agent" value="@polyon" />
              <InfoRow label="Memory Types" value="Conversation context, user preferences, working memory" />
              <InfoRow label="Embedding Model" value="text-embedding-3-small (OpenAI)" />
              <InfoRow label="Search Method" value="Semantic Search (cosine similarity)" />
            </div>
          </SectionCard>

          <SectionCard title="Configuration">
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              Configure via{' '}
              <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>
                Kubernetes ConfigMap
              </code>{' '}
              or{' '}
              <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>
                Secrets
              </code>
            </p>
            <div style={{ padding: '0.75rem 1rem', background: '#f4f4f4', border: '1px solid #e0e0e0', borderLeft: '3px solid #0f62fe' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)', marginBottom: '0.25rem' }}>
                Environment (polyon-mem0)
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', lineHeight: 2, color: '#161616' }}>
                <div>MEM0_API_KEY=your-api-key</div>
                <div>OPENAI_API_KEY=sk-...</div>
                <div>QDRANT_HOST=polyon-qdrant</div>
              </div>
            </div>
          </SectionCard>

          {(stats.status === 'down' || stats.status === 'unknown') && (
            <div style={{ padding: '1rem 1.25rem', background: '#fff1f1', border: '1px solid #ffd7d9', borderLeft: '3px solid #da1e28', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 600, color: '#da1e28', marginBottom: '0.25rem' }}>
                Cannot connect to Mem0 service
              </div>
              <div style={{ color: 'var(--cds-text-secondary)' }}>
                Verify that the polyon-mem0 container is running. Memory features are used by the Agent but can be queried from this console.
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
