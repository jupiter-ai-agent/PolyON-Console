// @ts-nocheck
import { useEffect, useState, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode, ComponentType } from 'react';
import {
  Header,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';
import {
  Dashboard,
  UserMultiple,
  GroupPresentation,
  FolderOpen,
  Tree,
  BareMetalServer,
  Email,
  Security,
  Settings,
  Activity,
  ChartLine,
  Terminal,
  DataBase,
  Key,
  Application,
  ContainerSoftware,
  Globe,
  Chat,
  Code,
  Bot,
  DnsServices,
  User,
  RecentlyViewed,
  DataShare,
  Document,
  CloudServiceManagement,
  ChevronDown,
  Launch,
} from '@carbon/icons-react';
import { useAppStore } from '../store/useAppStore';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { modulesApi, ModuleNavInfo } from '../api/modules';
import * as CarbonIcons from '@carbon/icons-react';

// ── Types ──
interface NavItem {
  type?: 'divider' | 'header' | 'group';
  label?: string;
  path?: string;
  icon?: ComponentType<{ size?: number }>;
  children?: NavItem[];
}

interface ModuleDef {
  title: string;
  defaultPath: string;
  icon: ComponentType<{ size?: number }>;
  desc?: string;
  section?: string;
  serviceId: string; // K8s 서비스 식별자 - 메뉴 동적화에 사용
  items: NavItem[] | null;
}

// ── Foundation module definitions (항상 표시) ──
const FOUNDATION_MODULES: Record<string, ModuleDef> = {
  home: {
    title: 'Dashboard',
    desc: '업무 현황 및 카드 보기',
    defaultPath: '/',
    icon: Dashboard,
    serviceId: 'home',
    items: null,
  },
  apps: {
    title: 'Applications',
    desc: '앱 관리 · SSO',
    defaultPath: '/apps',
    icon: Application,
    serviceId: 'apps',
    items: [
      { label: '앱 목록', path: '/apps', icon: Application },
      { label: 'SSO 설정', path: '/apps/sso-setup', icon: Key },
      { type: 'divider' },
      { label: 'Homepage Sites', path: '/homepage/sites', icon: Globe },
      { label: 'Site 생성', path: '/homepage/create', icon: Globe },
      { label: '빌드 현황', path: '/homepage/build', icon: Activity },
    ],
  },
  directory: {
    title: 'Directory',
    desc: '사용자 · 조직 · Drive 관리',
    section: 'DIRECTORY',
    defaultPath: '/users',
    icon: UserMultiple,
    serviceId: 'directory',
    items: [
      { label: '사용자 관리', path: '/users', icon: User },
      { label: '그룹 관리', path: '/groups', icon: GroupPresentation },
      { label: 'OUs', path: '/ous', icon: FolderOpen },
      { label: 'Computers', path: '/computers', icon: BareMetalServer },
      { type: 'divider' },
      { label: 'Drive 현황', path: '/directory/drive', icon: DataBase },
    ],
  },
  'tree-view': {
    title: 'Directory Tree',
    desc: '전체 AD 트리 구조 보기',
    section: 'DIRECTORY',
    defaultPath: '/tree',
    icon: Tree,
    serviceId: 'tree-view',
    items: null,
  },
  mail: {
    title: 'Mail',
    desc: '메일 서버 관리',
    section: 'SERVICES',
    defaultPath: '/mail',
    icon: Email,
    serviceId: 'mail',
    items: [
      { label: '개요', path: '/mail', icon: Email },
      {
        type: 'group', label: '디렉터리',
        children: [
          { label: '계정', path: '/mail/accounts' },
          { label: '그룹', path: '/mail/groups' },
          { label: '메일링 리스트', path: '/mail/lists' },
          { label: '도메인', path: '/mail/domains' },
          { label: '역할', path: '/mail/roles' },
          { label: '테넌트', path: '/mail/tenants' },
          { label: 'API 키', path: '/mail/api-keys' },
          { label: 'OAuth 클라이언트', path: '/mail/oauth-clients' },
        ],
      },
      {
        type: 'group', label: '큐 & 리포트',
        children: [
          { label: '큐', path: '/mail/queue' },
          { label: '발신 리포트', path: '/mail/queue-reports' },
          { label: '수신 리포트', path: '/mail/reports' },
        ],
      },
      {
        type: 'group', label: '이력',
        children: [
          { label: '수신 이력', path: '/mail/history-received' },
          { label: '발송 시도', path: '/mail/history-delivery' },
        ],
      },
      {
        type: 'group', label: '로그 & 추적',
        children: [
          { label: '로그', path: '/mail/logs' },
          { label: 'Live Tracing', path: '/mail/live-tracing' },
        ],
      },
      {
        type: 'group', label: '스팸 관리',
        children: [
          { label: '스팸 테스트', path: '/mail/spam-test' },
          { label: '샘플 업로드', path: '/mail/spam-upload' },
        ],
      },
      {
        type: 'group', label: '트러블슈팅',
        children: [
          { label: '전송 트러블슈팅', path: '/mail/troubleshoot' },
          { label: 'DMARC 트러블슈팅', path: '/mail/dmarc-troubleshoot' },
        ],
      },
      {
        type: 'group', label: '관리',
        children: [
          { label: 'TLS 인증서', path: '/mail/tls' },
          { label: 'Sieve 필터', path: '/mail/sieve' },
          { label: '유지보수', path: '/mail/maintenance' },
          { label: '서버 설정', path: '/mail/config' },
        ],
      },
    ],
  },
  appengine: {
    title: 'AppEngine',
    desc: 'Odoo ERP · 비즈니스 앱 관리',
    section: 'SERVICES',
    defaultPath: '/appengine/users',
    icon: Launch,
    serviceId: 'appengine',
    items: [
      { label: '사용자/권한', path: '/appengine/users', icon: UserMultiple },
      { label: '모듈/앱 관리', path: '/appengine/modules', icon: ContainerSoftware },
    ],
  },
  networking: {
    title: 'Networking',
    desc: 'DNS · DC · VPN · Firewall',
    section: 'INFRASTRUCTURE',
    defaultPath: '/dns',
    icon: Globe,
    serviceId: 'networking',
    items: [
      { label: 'DNS', path: '/dns', icon: DnsServices },
      { label: 'Domain Controllers', path: '/dcs', icon: BareMetalServer },
      { type: 'divider' },
      { label: 'VPN', path: '/services/vpn', icon: Globe },
      { label: 'Firewall Rules', path: '/services/firewall', icon: Security },
    ],
  },
  containers: {
    title: 'Containers',
    desc: '컨테이너 · 토폴로지 · 리소스',
    section: 'INFRASTRUCTURE',
    defaultPath: '/containers',
    icon: ContainerSoftware,
    serviceId: 'containers',
    items: [
      { label: '개요', path: '/containers', icon: ContainerSoftware },
      { label: '토폴로지', path: '/containers/topology', icon: ChartLine },
      { label: '리소스', path: '/containers/resources', icon: Activity },
    ],
  },
  database: {
    title: 'Database',
    desc: 'PostgreSQL · Redis · ES',
    section: 'INFRASTRUCTURE',
    defaultPath: '/databases/postgresql',
    icon: DataBase,
    serviceId: 'database',
    items: [
      { label: 'PostgreSQL', path: '/databases/postgresql', icon: DataBase },
      { label: 'Redis', path: '/databases/redis', icon: DataBase },
      { label: 'Elasticsearch', path: '/databases/elasticsearch', icon: DataBase },
      { label: 'RustFS', path: '/databases/rustfs', icon: DataBase },
    ],
  },
  monitoring: {
    title: 'Monitoring',
    desc: '모니터링 · 알림 · 로그',
    section: 'INFRASTRUCTURE',
    defaultPath: '/monitoring',
    icon: ChartLine,
    serviceId: 'monitoring',
    items: [
      { label: '대시보드', path: '/monitoring', icon: ChartLine },
      { type: 'header', label: '경보 및 분석' },
      { label: 'Alerts', path: '/monitoring/alerts', icon: Activity },
      { label: 'Sentinel Agent', path: '/monitoring/sentinel', icon: Bot },
      { type: 'divider' },
      { label: 'Logs', path: '/monitoring/logs', icon: Terminal },
    ],
  },
  prc: {
    title: 'Platform Resources',
    desc: '플랫폼 리소스 · PRC',
    section: 'INFRASTRUCTURE',
    defaultPath: '/prc',
    icon: DataBase,
    serviceId: 'prc',
    items: [
      { label: '개요', path: '/prc', icon: Dashboard },
      { label: 'Providers', path: '/prc/providers', icon: DataBase },
      { label: 'Claims', path: '/prc/claims', icon: Document },
      { label: 'Saga Log', path: '/prc/saga-log', icon: Activity },
    ],
  },
  security: {
    title: 'Security',
    desc: '보안 · 감사 · 정책',
    section: 'GOVERNANCE',
    defaultPath: '/security',
    icon: Security,
    serviceId: 'security',
    items: [
      { label: 'Audit Log', path: '/security', icon: Security },
      { type: 'divider' },
      { label: 'Policies', path: '/security/policies', icon: Key },
      { label: 'GPO', path: '/security/gpo', icon: Key },
      { label: 'Access Control', path: '/security/acl', icon: Key },
      { label: '접근 정책', path: '/security/access-policy', icon: Key },
      { label: '감사 로그', path: '/security/audit-log', icon: Key },
    ],
  },
  settings: {
    title: 'Settings',
    desc: '시스템 설정',
    section: 'SYSTEM',
    defaultPath: '/settings',
    icon: Settings,
    serviceId: 'settings',
    items: [
      { label: '일반', path: '/settings', icon: Settings },
      { label: '도메인', path: '/settings/domain', icon: Globe },
      { label: 'TLS / 인증서', path: '/settings/tls', icon: Key },
      { type: 'divider' },
      { label: '백업', path: '/settings/backup', icon: DataBase },
      { type: 'divider' },
      { label: '시스템 정보', path: '/settings/sysinfo', icon: BareMetalServer },
      { label: '서비스 인증', path: '/settings/credentials', icon: Key },
      { label: '내 계정', path: '/settings/account', icon: User },
      { label: '메일 발송 (SMTP)', path: '/settings/smtp', icon: Email },
      { label: '도메인 관리', path: '/settings/domain-mgmt', icon: Globe },
      { type: 'divider' },
      { label: '시스템 초기화', path: '/settings/reset', icon: Security },
      { label: '설정 이력', path: '/settings/config-history', icon: RecentlyViewed },
      { label: 'Git 미러링', path: '/settings/mirrors', icon: DataShare },
      { label: 'Workstream 이벤트', path: '/settings/workstream-events', icon: Activity },
    ],
  },
};

// ── Foundation menu order (항상 표시) ──
const FOUNDATION_NAV_ORDER = [
  'home',
  'apps',
  // DIRECTORY
  'directory',
  'tree-view',
  // SERVICES
  'mail',
  'appengine',
  // INFRASTRUCTURE
  'networking',
  'containers',
  'database',
  'monitoring',  // monitoring은 Foundation 유지 (시스템 모니터링은 기본)
  'prc',         // PRC — Platform Resource Claims
  // GOVERNANCE
  'security',
  // SYSTEM
  'settings',
];

// ── Icon mapping function ──
function getIconComponent(iconName: string): ComponentType<{ size?: number }> {
  const icon = (CarbonIcons as any)[iconName];
  return icon || CarbonIcons.Application;  // fallback
}

// ── Group modules by section ──
function groupBySection(modules: ModuleNavInfo[]): Record<string, ModuleNavInfo[]> {
  const groups: Record<string, ModuleNavInfo[]> = {};
  for (const mod of modules) {
    const section = mod.section || 'SERVICES';
    if (!groups[section]) groups[section] = [];
    groups[section].push(mod);
  }
  // 섹션 내 sortOrder 정렬
  for (const section of Object.keys(groups)) {
    groups[section].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return groups;
}

// ── Find module for path ──
function findModuleForPath(pathname: string): string {
  // Foundation 먼저 검색
  for (const [key, mod] of Object.entries(FOUNDATION_MODULES)) {
    if (mod.defaultPath === pathname) return key;
    if (mod.items) {
      for (const item of mod.items) {
        if (item.path && item.path !== '/' && pathname.startsWith(item.path)) return key;
        if (item.children) {
          for (const child of item.children) {
            if (child.path && pathname.startsWith(child.path)) return key;
          }
        }
      }
    }
  }
  // Module nav 검색
  const { moduleNav } = useAppStore.getState();
  for (const mod of (moduleNav || [])) {
    if (mod.defaultPath === pathname) return mod.id;
    for (const item of (mod.items || [])) {
      if (item.path && pathname.startsWith(item.path)) return mod.id;
    }
  }
  return 'home';
}

// ── ConsoleLayout ──
export default function ConsoleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { domainInfo, setDomainInfo, username, moduleNav, setModuleNav, moduleNavLoaded } = useAppStore();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const auth = useAuth();

  const currentModule = findModuleForPath(location.pathname);
  const foundationDef = FOUNDATION_MODULES[currentModule];
  const moduleDef = (moduleNav || []).find(m => m.id === currentModule);
  
  const hasSubmenu = foundationDef?.items != null || (moduleDef?.items?.length ?? 0) > 0;
  const submenuTitle = foundationDef?.title || moduleDef?.title || '';
  const submenuItems = foundationDef?.items || moduleDef?.items || [];

  useEffect(() => {
    apiFetch<{ realm?: string; base_dn?: string }>('/domain/info')
      .then((data) => {
        setDomainInfo({
          realm: data.realm ?? '',
          realmLower: (data.realm ?? '').toLowerCase(),
          base_dn: data.base_dn ?? '',
          domain: data.realm ? data.realm.split('.')[0] : '',
        });
      })
      .catch(() => {});
  }, [setDomainInfo]);

  // Module nav 로드
  useEffect(() => {
    if (!moduleNavLoaded) {
      modulesApi.getNav()
        .then(data => setModuleNav(data.modules))
        .catch(() => setModuleNav([]));  // API 실패해도 Foundation은 표시
    }
  }, [moduleNavLoaded, setModuleNav]);

  const handleNavItemClick = useCallback((path: string) => {
    setNavOpen(false);
    navigate(path);
  }, [navigate]);

  // Gather sections for display
  let lastSection: string | undefined;

  return (
    <div className="he-console">
      {/* ── Header ── */}
      <Header aria-label="PolyON Console">
        <button
          className="he-header__menu-btn"
          onClick={() => setNavOpen(!navOpen)}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            {navOpen
              ? <path d="M4 4l12 12M16 4L4 16"/>
              : <path d="M2 4.5h16M2 10h16M2 15.5h16"/>
            }
          </svg>
        </button>
        <a
          className="he-header__brand"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          href="#/"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer', padding: '0 12px' }}
        >
          <img
            src="https://cdn.jsdelivr.net/gh/choimars/cdn/triangles/logos/Triangles-logo_shadow.png"
            alt="Triangle.s"
            height="30"
            style={{ objectFit: 'contain' }}
          />
          <span style={{ color: '#FF7F11', fontSize: '1rem', fontWeight: 600 }}>PolyON</span>
          <span style={{ color: '#8d8d8d', fontSize: '0.625rem', fontWeight: 400, marginLeft: '4px', opacity: 0.7 }}>{__CONSOLE_VERSION__}</span>
        </a>
        {domainInfo.realm && (
          <span className="he-header-domain">{domainInfo.realm}</span>
        )}
        <div style={{ flex: 1 }} />
        <div className="he-header-user" style={{ position: 'relative' }}>
          <button 
            className="he-header-user-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="사용자 메뉴"
          >
            <User size={20} />
          </button>
          {userMenuOpen && (
            <>
              <div 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="he-user-panel">
                {/* 사용자 정보 영역 */}
                <div className="he-user-panel__header">
                  <div className="he-user-panel__info">
                    <div className="he-user-panel__name">{auth.displayName || username || 'Admin'}</div>
                    {auth.email && <div className="he-user-panel__email">{auth.email}</div>}
                  </div>
                  <div className="he-user-panel__avatar">
                    <User size={32} />
                  </div>
                </div>
                {/* 메뉴 링크 */}
                <div className="he-user-panel__links">
                  <button className="he-user-panel__link" onClick={() => { setUserMenuOpen(false); navigate('/settings/account'); }}>
                    프로파일
                  </button>
                  <button className="he-user-panel__link" onClick={() => { setUserMenuOpen(false); navigate('/settings/credentials'); }}>
                    자격 증명
                  </button>
                  <button className="he-user-panel__link" onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}>
                    설정
                  </button>
                </div>
                {/* 로그아웃 */}
                <div className="he-user-panel__footer">
                  <button className="he-user-panel__logout" onClick={() => { auth.logout(); }}>
                    로그아웃 →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Header>

      {/* ── Body ── */}
      <div className="he-body">
        {/* L1: Global Nav — Overlay */}
        {navOpen && (
          <div className="he-nav-backdrop" onClick={() => setNavOpen(false)} />
        )}
        <nav className={`he-nav ${navOpen ? 'he-nav--open' : ''}`}>
          <div className="he-nav__items">
            {(() => {
              // 모듈 메뉴를 섹션별로 그룹핑
              const modulesBySection = groupBySection(moduleNav || []);
              // 이미 렌더링된 섹션 추적
              const renderedSections = new Set<string>();
              let trackSection: string | undefined;

              // 특정 섹션의 모듈 아이템 렌더
              const renderModulesForSection = (section: string) => {
                const mods = modulesBySection[section];
                if (!mods || mods.length === 0) return null;
                renderedSections.add(section);
                return mods.map(mod => {
                  const Icon = getIconComponent(mod.icon);
                  const isActive = currentModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      className={`he-nav__item ${isActive ? 'he-nav__item--active' : ''}`}
                      onClick={() => handleNavItemClick(mod.defaultPath)}
                    >
                      <div className="he-nav__icon"><Icon size={20} /></div>
                      <span className="he-nav__label">{mod.title}</span>
                      {mod.items?.length > 0 && (
                        <svg className="he-nav__chevron" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                          <path d="M11 8L6 13l-.7-.7L9.6 8 5.3 3.7 6 3z" />
                        </svg>
                      )}
                    </button>
                  );
                });
              };

              // Foundation + 해당 섹션의 모듈을 함께 렌더
              const foundationItems = FOUNDATION_NAV_ORDER.map((key) => {
                const mod = FOUNDATION_MODULES[key];
                if (!mod) return null;

                const Icon = mod.icon;
                const isActive = currentModule === key;
                const showSection = mod.section && mod.section !== trackSection;
                if (mod.section) trackSection = mod.section;

                // 다음 Foundation 아이템의 섹션을 확인하여, 현재 섹션의 마지막 아이템인지 판단
                const currentIdx = FOUNDATION_NAV_ORDER.indexOf(key);
                const nextKey = FOUNDATION_NAV_ORDER[currentIdx + 1];
                const nextMod = nextKey ? FOUNDATION_MODULES[nextKey] : null;
                const isLastInSection = !nextMod || (nextMod.section && nextMod.section !== mod.section);

                return (
                  <div key={key}>
                    {showSection && (
                      <div className="he-nav__section">{mod.section}</div>
                    )}
                    <button
                      className={`he-nav__item ${isActive ? 'he-nav__item--active' : ''}`}
                      onClick={() => handleNavItemClick(mod.defaultPath)}
                    >
                      <div className="he-nav__icon">
                        <Icon size={20} />
                      </div>
                      <span className="he-nav__label">{mod.title}</span>
                      {mod.items && (
                        <svg className="he-nav__chevron" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                          <path d="M11 8L6 13l-.7-.7L9.6 8 5.3 3.7 6 3z" />
                        </svg>
                      )}
                    </button>
                    {/* 현재 섹션의 마지막 Foundation 아이템 뒤에 같은 섹션의 모듈 삽입 */}
                    {isLastInSection && mod.section && renderModulesForSection(mod.section)}
                  </div>
                );
              });

              // Foundation 섹션에 속하지 않은 나머지 모듈 (새 섹션)
              const remainingModules = Object.entries(modulesBySection)
                .filter(([section]) => !renderedSections.has(section))
                .map(([section, mods]) => (
                  <div key={`mod-section-${section}`}>
                    <div className="he-nav__section">{section}</div>
                    {mods.map(mod => {
                      const Icon = getIconComponent(mod.icon);
                      const isActive = currentModule === mod.id;
                      return (
                        <button
                          key={mod.id}
                          className={`he-nav__item ${isActive ? 'he-nav__item--active' : ''}`}
                          onClick={() => handleNavItemClick(mod.defaultPath)}
                        >
                          <div className="he-nav__icon"><Icon size={20} /></div>
                          <span className="he-nav__label">{mod.title}</span>
                          {mod.items?.length > 0 && (
                            <svg className="he-nav__chevron" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                              <path d="M11 8L6 13l-.7-.7L9.6 8 5.3 3.7 6 3z" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ));

              return [...foundationItems, ...remainingModules];
            })()}
          </div>
        </nav>

        {/* L2: Page Nav — Persistent */}
        {hasSubmenu && (
          <aside className="he-submenu">
            <div className="he-submenu__title">{submenuTitle}</div>
            <div className="he-submenu__items">
              <SubmenuItems items={submenuItems} pathname={location.pathname} navigate={navigate} />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`he-main ${!hasSubmenu ? 'he-main--no-submenu' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Collapsible group component ──
function CollapsibleGroup({
  item,
  pathname,
  navigate,
}: {
  item: NavItem;
  pathname: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isGroupActive = item.children?.some(c => c.path && pathname.startsWith(c.path)) ?? false;
  const [expanded, setExpanded] = useState(isGroupActive);

  return (
    <div className="he-submenu__group">
      <button
        className={`he-submenu__group-title ${isGroupActive ? 'he-submenu__group-title--active' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{item.label}</span>
        <ChevronDown
          size={16}
          className={`he-submenu__group-chevron ${expanded ? 'he-submenu__group-chevron--open' : ''}`}
        />
      </button>
      {expanded && item.children?.map((child, cidx) => {
        const isActive = child.path ? pathname === child.path || pathname.startsWith(child.path + '/') : false;
        return (
          <button
            key={cidx}
            className={`he-submenu__link he-submenu__link--child ${isActive ? 'he-submenu__link--active' : ''}`}
            onClick={() => child.path && navigate(child.path)}
          >
            {child.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Render submenu items ──
function SubmenuItems({
  items,
  pathname,
  navigate,
}: {
  items: NavItem[];
  pathname: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <>
      {items.map((item, idx) => {
        if (item.type === 'divider') {
          return <div key={`d-${idx}`} className="he-submenu__divider" />;
        }
        if (item.type === 'header') {
          return <div key={`h-${idx}`} className="he-submenu__header">{item.label}</div>;
        }
        if (item.type === 'group' && item.children) {
          return (
            <CollapsibleGroup
              key={`g-${item.label}`}
              item={item}
              pathname={pathname}
              navigate={navigate}
            />
          );
        }
        if (item.path) {
          const Icon = item.icon;
          const isActive = item.path === '/'
            ? pathname === '/'
            : pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <button
              key={`l-${item.path}`}
              className={`he-submenu__link ${isActive ? 'he-submenu__link--active' : ''}`}
              onClick={() => navigate(item.path!)}
            >
              {Icon && <Icon size={16} />}
              <span>{item.label}</span>
            </button>
          );
        }
        return null;
      })}
    </>
  );
}
