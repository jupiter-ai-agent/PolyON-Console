// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, TextInput, ContentSwitcher, Switch } from '@carbon/react';
import { APP_CATALOG, CATEGORIES, ENGINE_BADGES, type AppItem } from './appCatalog';

const CAT_META: Record<string, { desc: string; color: string }> = {
  homepage:      { desc: '조직의 웹 프레즌스',    color: '#161616' },
  platform:      { desc: '핵심 인프라 서비스',    color: '#0f62fe' },
  communication: { desc: '소통과 협업',           color: '#198038' },
  productivity:  { desc: '문서와 생산성',          color: '#6929c4' },
  business:      { desc: '업무 프로세스 관리',     color: '#b28600' },
  intelligence:  { desc: '데이터와 자동화',        color: '#da1e28' },
};

function groupApps(apps: AppItem[]): [string, AppItem[]][] {
  const grouped: Record<string, AppItem[]> = {};
  for (const app of apps) {
    if (!grouped[app.category]) grouped[app.category] = [];
    grouped[app.category].push(app);
  }
  return Object.keys(CATEGORIES)
    .filter(k => grouped[k])
    .map(k => [k, grouped[k]]);
}

function AppCard({ app }: { app: AppItem }) {
  const navigate = useNavigate();
  const isComingSoon = app.status === 'coming-soon';
  const eb = ENGINE_BADGES[app.engine];
  const accentColor = eb?.color || '#161616';

  const dotColor =
    app.status === 'active' ? '#198038' :
    app.status === 'requires-setup' ? '#b28600' :
    '#8d8d8d';

  function handleClick() {
    if (isComingSoon) return;
    if (app.id === 'sso') { navigate('/apps/sso-setup'); return; }
    if (app.id === 'homepage') { navigate('/homepage/sites'); return; }
    navigate(`/apps/${app.id}`);
  }

  const initial = app.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={handleClick}
      className="app-card"
      style={{
        background: '#fff',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 100,
        border: '1px solid #e0e0e0',
        marginTop: -1,
        marginLeft: -1,
        cursor: isComingSoon ? 'default' : 'pointer',
        opacity: isComingSoon ? 0.6 : 1,
        transition: 'border-left 0.12s, background 0.12s',
        position: 'relative',
        boxSizing: 'border-box',
        borderLeft: '1px solid #e0e0e0',
      }}
      onMouseEnter={e => {
        if (!isComingSoon) {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderLeft = `3px solid ${accentColor}`;
          el.style.background = '#f9f9f9';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderLeft = '1px solid #e0e0e0';
        el.style.background = '#fff';
      }}
      role={isComingSoon ? undefined : 'button'}
      tabIndex={isComingSoon ? undefined : 0}
      onKeyDown={e => { if (e.key === 'Enter' && !isComingSoon) handleClick(); }}
    >
      {/* Top row: icon + title + dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Icon */}
        <div style={{
          width: 32,
          height: 32,
          background: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 700, lineHeight: 1 }}>
            {initial}
          </span>
        </div>

        {/* Name + status dot */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#161616', lineHeight: 1.2 }}>
              {app.name}
            </span>
            <span style={{
              width: 8,
              height: 8,
              background: dotColor,
              display: 'inline-block',
              flexShrink: 0,
            }} />
          </div>
          {/* Description — 1 line, ellipsis */}
          <p style={{
            margin: '0.25rem 0 0',
            fontSize: 13,
            color: '#525252',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {app.desc}
          </p>
        </div>
      </div>

      {/* Bottom row: engine tag + arrow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {eb && (
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              padding: '2px 8px',
              background: eb.color,
              color: eb.fg || '#fff',
              display: 'inline-block',
            }}>
              {eb.label}
            </span>
          )}
        </div>
        {!isComingSoon && (
          <span style={{ color: '#525252', fontSize: 16, fontWeight: 400, lineHeight: 1 }}>
            &#8594;
          </span>
        )}
      </div>
    </div>
  );
}

type FilterTab = 'all' | 'active' | 'available' | 'coming-soon';

export default function AppsPage() {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const activeCount = APP_CATALOG.filter(a => a.status === 'active').length;
  const availableCount = APP_CATALOG.filter(a => a.status === 'available' || a.status === 'requires-setup').length;
  const totalCount = APP_CATALOG.length;

  const filtered = useMemo(() => {
    let list = APP_CATALOG;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
      );
    }
    if (filterTab === 'active') {
      list = list.filter(a => a.status === 'active' || a.status === 'requires-setup');
    } else if (filterTab === 'available') {
      list = list.filter(a => a.status === 'available');
    } else if (filterTab === 'coming-soon') {
      list = list.filter(a => a.status === 'coming-soon');
    }
    return list;
  }, [search, filterTab]);

  const groups = groupApps(filtered);

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #161616 0%, #393939 100%)',
        padding: '2.5rem 3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 160,
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 0 0.5rem' }}>
            Applications
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
            PolyON 통합 플랫폼 애플리케이션 카탈로그
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 160 }}>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ width: 8, height: 8, background: '#42be65', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>활성</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginLeft: 'auto' }}>{activeCount}개</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ width: 8, height: 8, background: '#8d8d8d', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>설치 가능</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginLeft: 'auto' }}>{availableCount}개</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ width: 8, height: 8, background: '#a8a8a8', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>전체</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginLeft: 'auto' }}>{totalCount}개</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#f4f4f4',
        padding: '1rem 3rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <div style={{ flex: '0 0 280px' }}>
          <TextInput
            id="app-search"
            labelText=""
            placeholder="앱 검색"
            size="sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ContentSwitcher
          size="sm"
          selectedIndex={['all', 'active', 'available', 'coming-soon'].indexOf(filterTab)}
          onChange={({ index }) => {
            const tabs: FilterTab[] = ['all', 'active', 'available', 'coming-soon'];
            setFilterTab(tabs[index]);
          }}
        >
          <Switch name="all" text="전체" />
          <Switch name="active" text="활성" />
          <Switch name="available" text="설치 가능" />
          <Switch name="coming-soon" text="Coming Soon" />
        </ContentSwitcher>
      </div>

      {/* Body */}
      <div style={{ padding: '2rem 3rem 4rem' }}>
        {groups.length === 0 && (
          <p style={{ color: '#8d8d8d', fontSize: 14, textAlign: 'center', marginTop: '3rem' }}>
            검색 결과가 없습니다.
          </p>
        )}
        {groups.map(([catId, apps]) => {
          const cat = CATEGORIES[catId] || { label: catId };
          const meta = CAT_META[catId] || { desc: '', color: '#161616' };
          return (
            <div key={catId} style={{ marginBottom: '3rem' }}>
              {/* Category Header */}
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 0,
                marginBottom: '1.25rem',
              }}>
                {/* Accent bar */}
                <div style={{
                  width: 4,
                  background: meta.color,
                  flexShrink: 0,
                  marginRight: '0.75rem',
                }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#161616', lineHeight: 1.3 }}>
                    {cat.label}
                  </h3>
                  {meta.desc && (
                    <p style={{ margin: 0, fontSize: 13, color: '#8d8d8d', marginTop: '0.15rem' }}>
                      {meta.desc}
                    </p>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                border: '1px solid #e0e0e0',
              }}>
                {apps.map(app => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
