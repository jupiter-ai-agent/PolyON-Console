// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile, Tag, SkeletonText, InlineNotification } from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

interface Component {
  id: string;
  name: string;
  description: string;
  version?: string;
  icon?: string;
  accent?: string;
  status?: string;
  category?: string;
}

interface HealthStatus {
  status: string;
  version?: string;
}

const STATUS_STYLES: Record<string, { label: string; type: 'green' | 'red' | 'yellow' | 'gray' }> = {
  healthy:  { label: 'Healthy',  type: 'green' },
  active:   { label: 'Active',   type: 'green' },
  degraded: { label: 'Degraded', type: 'yellow' },
  down:     { label: 'Down',     type: 'red' },
  stopped:  { label: 'Stopped',  type: 'red' },
  planned:  { label: 'Planned',  type: 'gray' },
  disabled: { label: 'Disabled', type: 'red' },
  deployed: { label: 'Deployed', type: 'green' },
};

const CATEGORY_LABELS: Record<string, { title: string; desc: string }> = {
  core:       { title: '코어',      desc: 'PolyON 플랫폼 자체 구성 요소' },
  engine:     { title: '앱 엔진',   desc: '사원이 사용하는 업무 서비스' },
  process:    { title: '프로세스',  desc: '비즈니스 프로세스 및 업무 자동화' },
  ai:         { title: 'AI',        desc: 'AI 에이전트 및 지능 레이어' },
  infra:      { title: '인프라',    desc: '데이터베이스, 스토리지, 네트워크' },
  monitoring: { title: '모니터링', desc: '관측 및 대시보드' },
};

const DISPLAY_ORDER = ['engine', 'ai', 'process', 'core', 'infra', 'monitoring'];

function ComponentCard({ comp, health, navigate, category }: { comp: Component; health?: HealthStatus; navigate?: ReturnType<typeof useNavigate>; category?: string }) {
  const accent = comp.accent || '#393939';
  const st = health ? STATUS_STYLES[health.status] || STATUS_STYLES.planned : null;
  const isClickable = category === 'core' && !!navigate;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={isClickable ? () => navigate(`/settings/sysinfo/${comp.id}`) : undefined}
      onMouseEnter={isClickable ? () => setHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setHovered(false) : undefined}
      style={{
        background: '#ffffff',
        border: '1px solid var(--cds-border-subtle)',
        borderLeft: `4px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,.16)' : '0 1px 3px rgba(0,0,0,.08)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease',
      }}>
      <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36,
            background: accent + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.125rem',
            color: accent,
            fontWeight: 700,
          }}>
            {comp.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>{comp.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-helper)', marginTop: 1 }}>{comp.description}</div>
          </div>
        </div>
        {st && (
          <Tag type={st.type} size="sm">{st.label}</Tag>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--cds-border-subtle)', margin: '0 1.25rem' }} />
      <div style={{ padding: '0.625rem 1.25rem 0.875rem', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--cds-text-helper)', fontWeight: 500 }}>버전</span>
        <span style={{ marginLeft: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
          {health?.version || comp.version || '—'}
        </span>
      </div>
    </div>
  );
}

export default function SettingsSysinfoPage() {
  const navigate = useNavigate();
  const [grouped, setGrouped] = useState<Record<string, Component[]>>({});
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.getSystemComponents();
        const g: Record<string, Component[]> = {};
        for (const comp of data.components) {
          const cat = comp.category || 'core';
          if (!g[cat]) g[cat] = [];
          g[cat].push(comp);
        }
        setGrouped(g);

        // Health
        const hm: Record<string, HealthStatus> = {};
        try {
          const keycloakRes = await fetch('/auth/realms/master');
          hm['keycloak'] = { status: keycloakRes.ok ? 'healthy' : 'down' };
        } catch { hm['keycloak'] = { status: 'down' }; }
        try {
          const eng = await settingsApi.getEnginesStatus();
          for (const [k, v] of Object.entries(eng.engines || {})) {
            hm[k] = v;
          }
        } catch { /**/ }
        setHealthMap(hm);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const orderedCats = [
    ...DISPLAY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !DISPLAY_ORDER.includes(c)),
  ];

  return (
    <>
      <PageHeader
        title="시스템 정보"
        description="PolyON 플랫폼 구성 요소 및 엔진 상태"
      />

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} style={{ marginBottom: '1rem' }} />
      )}

      {loading ? (
        <Tile style={{ marginTop: '1.5rem' }}>
          <SkeletonText paragraph lines={6} />
        </Tile>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {orderedCats.map(cat => {
            const meta = CATEGORY_LABELS[cat] || { title: cat, desc: '' };
            const items = grouped[cat] || [];
            return (
              <div key={cat} style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{meta.title}</h4>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--cds-text-helper)' }}>{meta.desc}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {items.map(comp => (
                    <ComponentCard key={comp.id} comp={comp} health={healthMap[comp.id]} navigate={navigate} category={cat} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
