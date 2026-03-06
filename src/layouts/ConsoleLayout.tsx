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
} from '@carbon/icons-react';
import { useAppStore } from '../store/useAppStore';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';

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

// ── Module definitions ──
const MODULES: Record<string, ModuleDef> = {
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
  chat: {
    title: 'Mattermost',
    desc: '채팅 서버 관리',
    section: 'SERVICES',
    defaultPath: '/chat',
    icon: Chat,
    serviceId: 'chat',
    items: [
      { label: '개요', path: '/chat', icon: Chat },
      { type: 'divider' },
      { label: '팀 관리', path: '/chat/teams', icon: UserMultiple },
      { label: '채널 관리', path: '/chat/channels', icon: Chat },
      { label: '사용자 관리', path: '/chat/users', icon: User },
      { type: 'divider' },
      { label: '서버 설정', path: '/chat/settings', icon: Settings },
    ],
  },
  ai: {
    title: 'AI Platform',
    desc: 'LLM · 에이전트 · 메모리',
    section: 'SERVICES',
    defaultPath: '/ai',
    icon: Bot,
    serviceId: 'ai',
    items: [
      { label: '대시보드', path: '/ai', icon: Bot },
      { label: 'Models', path: '/ai/models', icon: Code },
      { label: 'Agents', path: '/ai/agents', icon: Bot },
      { label: 'Memory', path: '/ai/memory', icon: DataBase },
      { label: 'API Keys', path: '/ai/keys', icon: Key },
      { label: 'Usage', path: '/ai/usage', icon: ChartLine },
      { type: 'divider' },
      { label: 'Settings', path: '/ai/settings', icon: Settings },
    ],
  },
  automation: {
    title: 'Automation',
    desc: 'n8n 워크플로우 자동화',
    section: 'SERVICES',
    defaultPath: '/automation',
    icon: DataShare,
    serviceId: 'automation',
    items: [
      { label: '개요', path: '/automation', icon: DataShare },
      { label: '워크플로우', path: '/automation/workflows', icon: Code },
      { label: '실행 이력', path: '/automation/executions', icon: Activity },
      { type: 'divider' },
      { label: '설정', path: '/automation/settings', icon: Settings },
    ],
  },
  bpmn: {
    title: 'BPMN',
    desc: '워크플로우 엔진',
    section: 'SERVICES',
    defaultPath: '/bpmn',
    icon: Code,
    serviceId: 'bpmn',
    items: [
      { label: '개요', path: '/bpmn', icon: Code },
      { type: 'divider' },
      { label: '프로세스 정의', path: '/bpmn/processes', icon: Code },
      { label: '실행 중 인스턴스', path: '/bpmn/instances', icon: Activity },
      { label: '태스크', path: '/bpmn/tasks', icon: Activity },
      { type: 'divider' },
      { label: '히스토리', path: '/bpmn/history', icon: ChartLine },
      { label: '인시던트', path: '/bpmn/incidents', icon: Security },
      { label: '배포 관리', path: '/bpmn/deployments' },
      { label: '의사결정 (DMN)', path: '/bpmn/decisions' },
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

// ── Menu order: Dashboard → Applications → sections ──
const PRIMARY_NAV_ORDER = [
  'home',
  'apps',
  // DIRECTORY
  'directory',
  'tree-view',
  // SERVICES
  'mail',
  'chat',
  'ai',
  'automation',
  'bpmn',
  // INFRASTRUCTURE
  'networking',
  'containers',
  'database',
  'monitoring',
  // GOVERNANCE
  'security',
  // SYSTEM
  'settings',
];

// ── Find module for path ──
function findModuleForPath(pathname: string): string {
  for (const [key, mod] of Object.entries(MODULES)) {
    if (mod.defaultPath === pathname) return key;
  }
  for (const [key, mod] of Object.entries(MODULES)) {
    if (!mod.items) continue;
    for (const item of mod.items) {
      if (item.path && item.path !== '/' && pathname.startsWith(item.path)) return key;
      if (item.children) {
        for (const child of item.children) {
          if (child.path && pathname.startsWith(child.path)) return key;
        }
      }
    }
  }
  return 'home';
}

// ── ConsoleLayout ──
export default function ConsoleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { domainInfo, setDomainInfo, username, installedServices } = useAppStore();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const auth = useAuth();

  const currentModule = findModuleForPath(location.pathname);
  const moduleDef = MODULES[currentModule];
  const hasSubmenu = moduleDef?.items !== null && moduleDef?.items !== undefined;

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
        </a>
        {domainInfo.realm && (
          <span className="he-header-domain">{domainInfo.realm}</span>
        )}
        <div style={{ flex: 1 }} />
        <div className="he-header-user" style={{ position: 'relative' }}>
          <button 
            className="he-header-user-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            <User size={16} />
            <span>{username || 'admin'}</span>
          </button>
          {userMenuOpen && (
            <>
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  minWidth: '120px',
                  zIndex: 1000,
                  marginTop: '4px'
                }}
              >
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    auth.logout();
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#333'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#f4f4f4'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  로그아웃
                </button>
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
            {PRIMARY_NAV_ORDER.map((key) => {
              const mod = MODULES[key];
              if (!mod) return null;
              
              // 설치되지 않은 서비스는 메뉴에서 제외
              if (!installedServices.includes(mod.serviceId)) {
                return null;
              }
              
              const Icon = mod.icon;
              const isActive = currentModule === key;
              const showSection = mod.section && mod.section !== lastSection;
              if (mod.section) lastSection = mod.section;

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
                    <div className="he-nav__text">
                      <span className="he-nav__label">{mod.title}</span>
                      {mod.desc && <span className="he-nav__desc">{mod.desc}</span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>

        {/* L2: Page Nav — Persistent */}
        {hasSubmenu && (
          <aside className="he-submenu">
            <div className="he-submenu__title">{moduleDef.title}</div>
            <div className="he-submenu__items">
              {renderSubmenuItems(moduleDef.items ?? [], location.pathname, navigate)}
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

// ── Render submenu items ──
function renderSubmenuItems(
  items: NavItem[],
  pathname: string,
  navigate: ReturnType<typeof useNavigate>
): ReactNode[] {
  return items.map((item, idx) => {
    if (item.type === 'divider') {
      return <div key={`d-${idx}`} className="he-submenu__divider" />;
    }
    if (item.type === 'header') {
      return <div key={`h-${idx}`} className="he-submenu__header">{item.label}</div>;
    }
    if (item.type === 'group' && item.children) {
      const isGroupActive = item.children.some(c => c.path && pathname.startsWith(c.path));
      return (
        <div key={`g-${item.label}`} className="he-submenu__group">
          <div className={`he-submenu__group-title ${isGroupActive ? 'he-submenu__group-title--active' : ''}`}>
            {item.label}
          </div>
          {item.children.map((child, cidx) => {
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
  });
}
