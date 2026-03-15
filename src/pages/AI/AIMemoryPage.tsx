import { useEffect, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { StatusBadge } from '../../components/StatusBadge';
import { aiApi } from '../../api/ai';
import type { MemoryStats } from '../../api/ai';

export default function AIMemoryPage() {
  const [stats,   setStats]   = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    aiApi.getMemoryStats()
      .then(d => setStats(d))
      .catch(() => setStats({ status: 'down', count: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--cds-layer-01)',
    border: '1px solid var(--cds-border-subtle-00)',
    padding: '1.25rem',
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem 1.5rem',
      lineHeight: 1.8, fontSize: '0.8125rem',
      borderBottom: '1px solid var(--cds-border-subtle-00)', padding: '6px 0',
    }}>
      <span style={{ color: 'var(--cds-text-secondary)', fontWeight: 600 }}>{label}</span>
      <span>{value}</span>
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', marginBottom: '1rem' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  );

  const status = stats?.status ?? 'unknown';
  const isDown = status === 'down' || status === 'unknown';

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>AI Memory</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            Memory Manager — Agent 장기 기억 레이어 (OpenSearch 기반)
          </p>
        </div>
        <Button kind="ghost" hasIconOnly renderIcon={Renew} iconDescription="새로고침" onClick={load} />
      </div>

      {loading ? (
        <InlineLoading description="메모리 상태 로딩 중..." />
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)', marginBottom: '0.75rem' }}>
                Memory Manager
              </div>
              <StatusBadge status={status as 'healthy' | 'down' | 'unknown' | 'warning'} />
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
                저장된 메모리
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                {(stats?.count || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>건</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
                서비스
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.5rem' }}>polyon-memory</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                :8080
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)' }}>
                Vector DB
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.5rem' }}>OpenSearch</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
                index: polyon-agent-memory
              </div>
            </div>
          </div>

          {/* Architecture */}
          <SectionCard title="메모리 구조">
            <InfoRow label="메모리 스택" value={
              <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', background: 'var(--cds-layer-02)', padding: '2px 6px' }}>
                ZeroClaw Agent → Memory Manager → OpenSearch
              </code>
            } />
            <InfoRow label="API Endpoint" value={
              <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', background: 'var(--cds-layer-02)', padding: '2px 6px' }}>
                {(stats as any)?.endpoint || 'http://polyon-memory.polyon.svc:8080/memory/search'}
              </code>
            } />
            <InfoRow label="메모리 유형" value="short_term · long_term · episodic" />
            <InfoRow label="임베딩 모델" value="LiteLLM /embeddings (text-embedding-3-small)" />
            <InfoRow label="검색 방식" value="knn_vector (cosine similarity) — OpenSearch 3.x" />
            <InfoRow label="PII 필터링" value="주민번호 · 전화번호 · 카드번호 · 이메일 자동 마스킹" />
            <InfoRow label="사원 격리" value="user_id 기반 완전 분리 — 타 사원 접근 불가" />
            <InfoRow label="Phase 2 전환" value="MEM0_ENABLED=true 설정 시 Mem0 SDK 자동 활성화" />
          </SectionCard>

          {/* Configuration */}
          <SectionCard title="환경 설정">
            <div style={{ padding: '0.75rem 1rem', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', borderLeft: '3px solid var(--cds-interactive)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)', marginBottom: '0.5rem' }}>
                polyon-memory (K8s Deployment)
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', lineHeight: 2 }}>
                <div>OPENSEARCH_URL=http://polyon-search.polyon.svc:9200</div>
                <div>OPENSEARCH_INDEX=polyon-agent-memory</div>
                <div>LITELLM_URL=http://polyon-ai.polyon.svc:4000</div>
                <div>LITELLM_MASTER_KEY=sk-polyon-...</div>
                <div>MEM0_ENABLED=false  <span style={{ color: 'var(--cds-text-secondary)' }}># Phase 2에서 true로 전환</span></div>
              </div>
            </div>
          </SectionCard>

          {/* Status alert */}
          {isDown ? (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--cds-notification-background-error)', border: '1px solid var(--cds-support-error)', borderLeft: '3px solid var(--cds-support-error)', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--cds-support-error)', marginBottom: '0.25rem' }}>
                Memory Manager 연결 실패
              </div>
              <div style={{ color: 'var(--cds-text-secondary)' }}>
                polyon-memory Pod 상태를 확인하세요. Agent 메모리 기능이 정상 동작하지 않을 수 있습니다.
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--cds-text-secondary)' }}>
                kubectl get pods -n polyon -l app=polyon-memory
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--cds-notification-background-success)', border: '1px solid var(--cds-support-success)', borderLeft: '3px solid var(--cds-support-success)', fontSize: '0.8125rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--cds-support-success)', marginBottom: '0.25rem' }}>
                Memory Manager 정상 운영 중
              </div>
              <div style={{ color: 'var(--cds-text-secondary)' }}>
                Agent가 OpenSearch 기반 메모리 레이어를 사용할 준비가 됐습니다.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
