import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@carbon/react';
import { PageHeader }   from '../../components/PageHeader';
import { StatusBadge }  from '../../components/StatusBadge';
import { aiApi }        from '../../api/ai';
import type { Agent }   from '../../api/ai';

export default function AIAgentsPage() {
  const navigate = useNavigate();
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    aiApi.getAgents()
      .then(d => setAgents(d.agents || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const cardStyle: React.CSSProperties = {
    background:   '#fff',
    border:       '1px solid #e0e0e0',
    overflow:     'hidden',
  };

  return (
    <>
      <PageHeader title="Agent Management" description="PolyON AI agent status and configuration" />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>Loading...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>Error: {error}</div>
      ) : agents.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          No registered agents found.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            {agents.map(a => {
              const status = a.status as 'healthy' | 'down' | 'unknown' | 'warning';
              const borderColor = status === 'healthy' ? '#24a148' : status === 'down' ? '#da1e28' : '#c6c6c6';
              return (
                <div key={a.id} style={{ ...cardStyle, borderTop: `3px solid ${borderColor}` }}>
                  <div style={{
                    padding: '1.25rem', borderBottom: '1px solid #e0e0e0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{a.name || a.id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.125rem' }}>{a.id}</div>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                  <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                        Default Model
                      </div>
                      <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        <code style={{ background: '#f4f4f4', padding: '2px 6px',  fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                          polyon-default
                        </code>
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>Gemini 2.5 Flash</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                        Memory Allocation
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 300, marginTop: '0.25rem' }}>
                        {a.memory_mb || 768}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>MB</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', background: '#f4f4f4', display: 'flex', gap: '0.5rem' }}>
                    <Button kind="ghost" size="sm" onClick={() => navigate('/ai/memory')}>
                      Memory
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => navigate('/ai/usage')}>
                      Usage
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => navigate('/ai/pipeline')}>
                      Pipeline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agent details table */}
          <div style={{ marginTop: '1.5rem', background: '#fff', border: '1px solid #e0e0e0' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Agent Configuration</h4>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.25rem 1rem', fontSize: '0.8125rem', lineHeight: 1.8 }}>
                {[
                  ['Agent ID',       'polyon'],
                  ['Name',           '@polyon'],
                  ['Default Model',  'openai/polyon-default → Gemini 2.5 Flash'],
                  ['Memory Backend', 'Mem0 (polyon-mem0:8080)'],
                  ['Endpoint',       'http://polyon-agent:18789'],
                  ['Memory',         '768 MB'],
                ].map(([label, value]) => (
                  <>
                    <span key={`l-${label}`} style={{ color: 'var(--cds-text-helper)', fontWeight: 600 }}>{label}</span>
                    <span key={`v-${label}`}>
                      {label === 'Default Model' || label === 'Endpoint' ? (
                        <code style={{ background: '#f4f4f4', padding: '2px 6px',  fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {value}
                        </code>
                      ) : value}
                    </span>
                  </>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
