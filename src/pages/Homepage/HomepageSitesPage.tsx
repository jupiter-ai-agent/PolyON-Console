// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Button, Tag } from '@carbon/react';
import { Add, Globe } from '@carbon/icons-react';

interface Site {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  method?: string;
  repoUrl?: string;
  updatedAt?: string;
}

const STATUS_MAP: Record<string, { type: string; label: string }> = {
  live:       { type: 'green',     label: '운영 중' },
  creating:   { type: 'blue',      label: '생성 중' },
  cloning:    { type: 'blue',      label: 'Clone 중' },
  installing: { type: 'blue',      label: '설치 중' },
  building:   { type: 'blue',      label: '빌드 중' },
  deploying:  { type: 'blue',      label: '배포 중' },
  error:      { type: 'red',       label: '오류' },
  draft:      { type: 'warm-gray', label: '작성 중' },
};

function StatusTag({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return <Tag type={s.type as any}>{s.label}</Tag>;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function HomepageSitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sites');
      if (res.ok) {
        const d = await res.json();
        setSites(Array.isArray(d) ? d : (d.data || []));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader
        title="Homepage"
        description="홈페이지를 만들고 관리합니다. CMS로 콘텐츠를 편집하거나, Git 레포를 연결해 빌드하세요."
        actions={
          <Button
            kind="primary"
            renderIcon={Add}
            onClick={() => navigate('/homepage/create')}
          >
            새 사이트
          </Button>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>불러오는 중...</div>
      ) : sites.length === 0 ? (
        <div style={{ padding: '5rem', textAlign: 'center', border: '2px dashed #e0e0e0', background: '#fafafa', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Globe size={48} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>아직 사이트가 없습니다</h3>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            CMS 또는 Git 방식으로 홈페이지를 만들어보세요.
          </p>
          <Button
            kind="primary"
            renderIcon={Add}
            onClick={() => navigate('/homepage/create')}
          >
            새 사이트 만들기
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {sites.map(s => {
            const domain = s.domain || `${s.slug}.polyon.local`;
            return (
              <div
                key={s.id}
                onClick={() => navigate('/homepage/build', { state: { siteId: s.id } })}
                style={{
                  background: '#fff', border: '1px solid #e0e0e0',
                  padding: '1.5rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#0f62fe')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{s.name}</h4>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#0f62fe', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Globe size={12} /> {domain}
                    </div>
                  </div>
                  <StatusTag status={s.status} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  {s.method && (
                    <span style={{ padding: '1px 8px', background: '#f4f4f4', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem' }}>
                      {s.method === 'git' ? 'Git' : s.method === 'strapi' ? 'CMS' : s.method}
                    </span>
                  )}
                  {s.repoUrl && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {s.repoUrl.replace('https://', '')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f4f4f4', paddingTop: '1rem', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>최종 수정: {timeAgo(s.updatedAt)}</span>
                  {s.status === 'live' && (
                    <a
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ color: '#0f62fe', textDecoration: 'none', fontSize: '0.75rem' }}
                    >
                      사이트 열기 →
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <div
            onClick={() => navigate('/homepage/create')}
            style={{
              background: '#fff', border: '2px dashed #e0e0e0',
              padding: '1.5rem', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              minHeight: '180px', color: 'var(--cds-text-secondary)',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#0f62fe')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
          >
            <Add size={32} style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.875rem' }}>새 사이트 만들기</div>
          </div>
        </div>
      )}
    </>
  );
}
