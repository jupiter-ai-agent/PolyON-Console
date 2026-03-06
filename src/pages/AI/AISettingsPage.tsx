import { useEffect, useState } from 'react';
import { Button }       from '@carbon/react';
import { PageHeader }   from '../../components/PageHeader';
import { StatusBadge }  from '../../components/StatusBadge';
import { apiFetch }     from '../../api/client';

interface EngineStatus {
  engines?: {
    litellm?: { status: string; version?: string };
  };
}

const PROVIDERS = [
  { name: 'OpenAI',           env: 'OPENAI_API_KEY' },
  { name: 'Anthropic (Claude)', env: 'ANTHROPIC_API_KEY' },
  { name: 'Google (Gemini)',  env: 'GEMINI_API_KEY' },
  { name: 'Azure OpenAI',     env: 'AZURE_API_KEY' },
  { name: 'AWS Bedrock',      env: 'AWS_ACCESS_KEY_ID' },
  { name: 'Ollama (Local)',   env: 'OLLAMA_API_BASE' },
  { name: 'Mistral',          env: 'MISTRAL_API_KEY' },
  { name: 'Cohere',           env: 'COHERE_API_KEY' },
];

export default function AISettingsPage() {
  const [health,       setHealth]       = useState<string>('unknown');
  const [version,      setVersion]      = useState<string>('—');
  const [keyVisible,   setKeyVisible]   = useState(false);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    apiFetch<EngineStatus>('/engines/status')
      .then(d => {
        const ai = d.engines?.litellm;
        if (ai) {
          setHealth(ai.status || 'unknown');
          setVersion(ai.version || '—');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  );

  return (
    <>
      <PageHeader title="AI Settings" description="LLM providers, caching, and authentication configuration" />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* Service Status */}
          <SectionCard title="Service Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <StatusBadge status={health as 'healthy' | 'down' | 'unknown' | 'warning'} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>LiteLLM v{version}</span>
              <span style={{ color: '#e0e0e0' }}>|</span>
              <span style={{ fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)' }}>
                http://polyon-ai:4000
              </span>
            </div>
          </SectionCard>

          {/* LLM Providers */}
          <SectionCard title="LLM Providers">
            <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: '0 0 1rem' }}>
              Provider API keys are managed in{' '}
              <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>Kubernetes Secrets</code>{' '}
              or{' '}
              <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>ConfigMap</code>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {PROVIDERS.map(p => (
                <div key={p.name} style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '0.75rem',
                  padding:    '0.75rem 1rem',
                  background: '#f4f4f4',
                  border:     '1px solid #e0e0e0',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: '0.6875rem', fontFamily: "'IBM Plex Mono', monospace", color: '#8d8d8d', marginTop: 1 }}>
                      {p.env}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Setup instructions */}
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f4f4f4', border: '1px solid #e0e0e0', borderLeft: '3px solid #0f62fe' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem' }}>Setup Guide</div>
              <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--cds-text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
{`# Create API key secret
kubectl create secret generic ai-api-keys \\
  --from-literal=OPENAI_API_KEY=sk-... \\
  --namespace default

# Restart AI service
kubectl rollout restart deployment/polyon-ai`}
              </pre>
            </div>
          </SectionCard>

          {/* Caching */}
          <SectionCard title="Caching (Redis)">
            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              <p style={{ margin: '0 0 0.75rem' }}>
                When Redis caching is enabled, identical requests return cached responses.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 500 }}>Host:</span>
                <code style={{ background: '#f4f4f4', padding: '2px 8px', fontSize: '0.75rem' }}>
                  polyon-redis:6379
                </code>
              </div>
              <div style={{ padding: '0.5rem 0.75rem', background: '#fdf6dd', fontSize: '0.75rem', color: '#8a6d00' }}>
                To enable caching, add{' '}
                <code>LITELLM_CACHE=True</code> + <code>REDIS_HOST=polyon-redis</code>{' '}
                to the polyon-ai environment variables.
              </div>
            </div>
          </SectionCard>

          {/* Master Key */}
          <SectionCard title="Master Key">
            <div style={{ fontSize: '0.8125rem' }}>
              <p style={{ margin: '0 0 0.75rem', color: 'var(--cds-text-secondary)' }}>
                LiteLLM proxy admin authentication key. Used for all management API calls.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ background: '#f4f4f4', padding: '4px 10px', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {keyVisible ? 'Check the server .env file' : 'sk-polyon-••••••••••••'}
                </code>
                <Button
                  kind="ghost"
                 
                  onClick={() => setKeyVisible(!keyVisible)}
                >
                  {keyVisible ? 'Hide' : 'Show'}
                </Button>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.6875rem', color: '#8d8d8d' }}>
                Environment variable: <code>LITELLM_MASTER_KEY</code> (managed in .env file)
              </div>
            </div>
          </SectionCard>

          {/* Rate Limiting */}
          <SectionCard title="Rate Limiting">
            <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              <p style={{ margin: '0 0 0.5rem' }}>
                Set RPM (requests per minute) and TPM (tokens per minute) limits per API key.
              </p>
              <p style={{ margin: 0 }}>
                Configure with{' '}
                <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>tpm_limit</code>{' '}
                and{' '}
                <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.75rem' }}>rpm_limit</code>{' '}
                parameters when creating keys.
              </p>
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}
