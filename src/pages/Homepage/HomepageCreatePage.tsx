// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Button, TextInput, InlineNotification } from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';

type Method = 'git' | 'strapi';

export default function HomepageCreatePage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>('git');
  const [form, setForm] = useState({
    name: '', slug: '', domain: '',
    repoUrl: '', branch: 'main',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('사이트 이름을 입력하세요.'); return; }
    if (!form.slug.trim()) { setError('슬러그를 입력하세요.'); return; }
    if (method === 'git' && !form.repoUrl.trim()) { setError('Git 레포 URL을 입력하세요.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, method }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'HTTP ' + res.status);
      }
      navigate('/homepage/sites');
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  return (
    <>
      <PageHeader
        title="새 사이트 만들기"
        description="CMS 또는 Git 방식으로 새 홈페이지 사이트를 생성합니다."
        actions={
          <Button
            kind="ghost"
            size="sm"
            renderIcon={ArrowLeft}
            onClick={() => navigate('/homepage/sites')}
          >
            목록으로
          </Button>
        }
      />

      <div style={{ maxWidth: 640, marginTop: '1.5rem' }}>
        {/* Method selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { id: 'git', label: 'Git 연결', desc: 'Git 레포를 연결하여 빌드 및 배포' },
            { id: 'strapi', label: 'CMS (Strapi)', desc: 'CMS로 콘텐츠를 직접 관리' },
          ].map(m => (
            <Button
              key={m.id}
              kind={method === m.id ? 'primary' : 'ghost'}
              size="lg"
              onClick={() => setMethod(m.id as Method)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '1.25rem',
                height: 'auto',
                minHeight: '5rem',
                border: `2px solid ${method === m.id ? '#0f62fe' : '#e0e0e0'}`,
                background: method === m.id ? '#edf5ff' : '#fff',
                color: '#161616',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>{m.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontWeight: 400, display: 'block', whiteSpace: 'normal', textAlign: 'left' }}>{m.desc}</span>
            </Button>
          ))}
        </div>

        {/* Form */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="site-name"
            labelText="사이트 이름 *"
            placeholder="My Homepage"
            value={form.name}
            onChange={e => update('name', e.target.value)}
          />
          <div>
            <TextInput
              id="site-slug"
              labelText="슬러그 *"
              placeholder="my-homepage"
              value={form.slug}
              onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
            <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
              URL: {form.slug || 'my-homepage'}.polyon.local
            </div>
          </div>
          <TextInput
            id="site-domain"
            labelText="커스텀 도메인 (선택)"
            placeholder="example.com"
            value={form.domain}
            onChange={e => update('domain', e.target.value)}
          />

          {method === 'git' && (
            <>
              <TextInput
                id="site-repo-url"
                labelText="Git 레포 URL *"
                placeholder="https://github.com/org/repo.git"
                value={form.repoUrl}
                onChange={e => update('repoUrl', e.target.value)}
              />
              <TextInput
                id="site-branch"
                labelText="브랜치"
                placeholder="main"
                value={form.branch}
                onChange={e => update('branch', e.target.value)}
              />
            </>
          )}

          {error && (
            <InlineNotification
              kind="error"
              title="오류"
              subtitle={error}
              hideCloseButton
            />
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button
              kind="secondary"
              onClick={() => navigate('/homepage/sites')}
            >
              취소
            </Button>
            <Button
              kind="primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '생성 중...' : '사이트 생성'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
