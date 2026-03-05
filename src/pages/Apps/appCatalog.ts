export type AppStatus = 'active' | 'available' | 'requires-setup' | 'installing' | 'stopped' | 'error' | 'coming-soon' | 'update-available';

export interface AppItem {
  id: string;
  name: string;
  desc: string;
  base: string;
  engine: string;
  icon: string;
  category: string;
  phase: number;
  isCore?: boolean;
  subdomain?: string | null;
  containers: string[];
  requires?: string[];
  status: AppStatus;
  statusLabel: string;
  details: string;
  actions: string[];
  url?: string;
}

export const APP_CATALOG: AppItem[] = [
  /* ══ Platform ══ */
  { id: 'portal', name: 'Portal', desc: '사용자 홈 · 앱 런처 · 대시보드', base: 'Custom', engine: 'polyon-core', icon: 'home', category: 'platform', phase: 1, isCore: true, subdomain: '', containers: ['polyon-portal'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '직원이 로그인하면 처음 보는 화면. 앱 런처, 최근 활동, 즐겨찾기, 조직도, 프로필.', actions: [] },
  { id: 'notification', name: 'Notification', desc: '통합 알림 · 크로스앱 이벤트 · 푸시', base: 'Custom (Redis Pub/Sub)', engine: 'polyon-core', icon: 'notification', category: 'platform', phase: 1, isCore: true, containers: ['polyon-notification'], requires: ['sso', 'portal'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '모든 앱의 알림을 한 곳에서. 앱 내(Portal), 이메일(Stalwart), 모바일 푸시(PWA).', actions: [] },
  { id: 'search', name: 'Search', desc: '통합 검색 · 크로스앱 인덱싱', base: 'Elasticsearch', engine: 'elasticsearch', icon: 'search', category: 'platform', phase: 1, isCore: true, containers: ['polyon-search'], requires: ['sso', 'portal'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '⌘K 글로벌 검색. 메일, 문서, 채팅, 업무 — 모든 앱을 한 번에 검색.', actions: [] },
  { id: 'vault', name: 'Vault', desc: '비밀번호 관리 · 팀 인증정보 공유', base: 'Vaultwarden', engine: 'standalone', icon: 'locked', category: 'platform', phase: 2, subdomain: 'vault', containers: ['app-vaultwarden'], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: 'Bitwarden 호환 비밀번호 관리. 팀 공용 비밀번호, API 키, 인증정보 안전하게 공유.', actions: ['install'], url: 'https://github.com/dani-garcia/vaultwarden' },
  { id: 'sso', name: 'Single Sign-On', desc: '통합 인증 · OIDC · LDAP Federation', base: 'Keycloak', engine: 'keycloak', icon: 'key', category: 'platform', phase: 0, isCore: true, subdomain: 'sso', containers: ['polyon-auth'], status: 'requires-setup', statusLabel: '설정 필요', details: "Keycloak 기반 SSO. 활성화 시 services realm 자동 생성, 도메인 연동, Let's Encrypt 인증서 발급.", actions: ['setup'] },
  /* ══ Homepage ══ */
  { id: 'homepage', name: 'Homepage', desc: 'MDX 기반 홈페이지 빌더 · 편집 · 배포', base: 'Astro + MDX', engine: 'standalone', icon: 'applicationWeb', category: 'homepage', phase: 2, subdomain: 'www', containers: ['app-homepage'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: 'MDX(Markdown + JSX) 기반 홈페이지 빌더. 웹 에디터로 콘텐츠 작성, GitLab 소스 관리, Astro 빌드 엔진으로 정적 사이트 생성 및 배포.', actions: [] },
  /* ══ Communication ══ */
  { id: 'mail', name: 'Mail', desc: 'SMTP · IMAP · 웹메일', base: 'Stalwart Mail', engine: 'stalwart', icon: 'email', category: 'communication', phase: 2, subdomain: 'mail', containers: ['polyon-mail'], requires: ['sso'], status: 'active', statusLabel: 'Active', details: 'Stalwart Mail Server. SMTP/IMAP/JMAP 지원. AD 계정 자동 연동.', actions: ['settings', 'stop'] },
  { id: 'calendar', name: 'Calendar', desc: 'CalDAV · 일정 관리 · 리소스 예약', base: 'Stalwart (내장 CalDAV)', engine: 'stalwart', icon: 'calendar', category: 'communication', phase: 2, subdomain: 'cal', containers: ['polyon-mail'], requires: ['sso', 'mail'], status: 'available', statusLabel: '설치 가능', details: 'Stalwart 내장 CalDAV. 공유 캘린더, 회의실 예약 지원.', actions: ['install'] },
  { id: 'contacts', name: 'Contacts', desc: 'CardDAV · 주소록 · AD 연동', base: 'Stalwart (내장 CardDAV)', engine: 'stalwart', icon: 'userMultiple', category: 'communication', phase: 2, subdomain: 'contacts', containers: ['polyon-mail'], requires: ['sso', 'mail'], status: 'available', statusLabel: '설치 가능', details: 'Stalwart 내장 CardDAV. Active Directory 주소록 자동 동기화.', actions: ['install'] },
  { id: 'chat', name: 'Chat', desc: '팀 메신저 · 채널 · 화상회의', base: 'Mattermost', engine: 'mattermost', icon: 'chat', category: 'communication', phase: 2, subdomain: 'chat', containers: ['polyon-chat'], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: 'Mattermost 기반 팀 메신저. 채널, DM, 쓰레드, 파일 공유, 1:1 통화. PostgreSQL 네이티브, AD 계정 자동 연동.', actions: ['install'], url: 'https://mattermost.com' },
  { id: 'board', name: 'Board', desc: '공지사항 · 게시판 · 사내 소식', base: 'Custom', engine: 'polyon-core', icon: 'bulletin', category: 'communication', phase: 2, subdomain: 'board', containers: ['app-board'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '사내 공지, 부서 게시판, 자유게시판.', actions: [] },
  { id: 'sms', name: 'SMS', desc: '문자 발송 · 2FA 인증 · 알림톡 폴백', base: 'CoolSMS', engine: 'external-api', icon: 'mobile', category: 'communication', phase: 2, subdomain: null, containers: [], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: 'SMS/LMS/MMS 발송. 2FA 인증코드, 비밀번호 초기화 등.', actions: ['install'], url: 'https://coolsms.co.kr' },
  /* ══ Productivity ══ */
  { id: 'documents', name: 'Documents', desc: '파일 관리 · 공동편집 · WebDAV', base: 'Nextcloud + ONLYOFFICE', engine: 'standalone', icon: 'document', category: 'productivity', phase: 2, subdomain: 'docs', containers: ['app-nextcloud', 'app-onlyoffice'], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: 'Nextcloud + ONLYOFFICE. 파일 공유, MS Office 호환 공동편집, WebDAV.', actions: ['install'] },
  { id: 'wiki', name: 'Wiki', desc: '지식 관리 · 화이트보드 · 블록 에디터', base: 'AFFiNE', engine: 'affine', icon: 'notebook', category: 'productivity', phase: 2, subdomain: 'wiki', containers: ['app-affine'], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: 'AFFiNE 기반 위키. Notion + Miro 대체. 블록 에디터, 칸반, 화이트보드.', actions: ['install'], url: 'https://affine.pro' },
  { id: 'note', name: 'Note', desc: '메모 · 스티키노트 · 빠른 공유', base: 'HedgeDoc', engine: 'standalone', icon: 'edit', category: 'productivity', phase: 2, subdomain: 'note', containers: ['app-hedgedoc'], requires: ['sso'], status: 'available', statusLabel: '설치 가능', details: '실시간 협업 마크다운 메모. 빠른 아이디어 기록, 회의록, 코드 스니펫 공유.', actions: ['install'], url: 'https://hedgedoc.org' },
  { id: 'project', name: 'Project', desc: '프로젝트 관리 · 태스크 · 칸반', base: 'Odoo Project', engine: 'odoo', icon: 'taskView', category: 'productivity', phase: 2, subdomain: 'project', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '프로젝트·태스크 관리. 칸반 보드, 마일스톤, 데드라인 추적.', actions: [] },
  { id: 'survey', name: 'Survey', desc: '설문 · 양식 · 만족도 조사', base: 'Odoo Survey', engine: 'odoo', icon: 'list', category: 'productivity', phase: 2, subdomain: 'survey', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '설문·양식 빌더. 직원 설문, 채용 시험, 고객 만족도 조사.', actions: [] },
  /* ══ Business ══ */
  { id: 'hr', name: 'HR', desc: '인사 관리 · 조직도 · 근태 · 휴가', base: 'Odoo HR', engine: 'odoo', icon: 'userMultiple', category: 'business', phase: 1, subdomain: 'hr', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '인사 관리 시스템. 직원 정보, 조직도, 근태, 휴가 신청/승인, 인사평가.', actions: [] },
  { id: 'crm', name: 'CRM', desc: '고객 관리 · 영업 파이프라인', base: 'Odoo CRM', engine: 'odoo', icon: 'partnership', category: 'business', phase: 2, subdomain: 'crm', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '고객·거래처 관리. 영업 파이프라인, 기회 추적, 미팅 일정, 매출 예측.', actions: [] },
  { id: 'recruitment', name: 'Recruitment', desc: '채용 관리 · 지원자 추적 · 면접', base: 'Odoo Recruitment', engine: 'odoo', icon: 'userFollow', category: 'business', phase: 2, subdomain: null, containers: ['polyon-odoo'], requires: ['sso', 'hr'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '채용 파이프라인 관리. 채용 공고, 지원자 추적, 면접 일정.', actions: [] },
  { id: 'timesheet', name: 'Timesheet', desc: '근무시간 기록 · 프로젝트별 공수', base: 'Odoo Timesheet', engine: 'odoo', icon: 'time', category: 'business', phase: 2, subdomain: null, containers: ['polyon-odoo'], requires: ['sso', 'hr', 'project'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '프로젝트·태스크별 근무시간 기록. HR 근태 + Project 연계.', actions: [] },
  { id: 'expense', name: 'Expense', desc: '경비 청구 · 영수증 · 정산', base: 'Odoo Expense', engine: 'odoo', icon: 'receipt', category: 'business', phase: 2, subdomain: null, containers: ['polyon-odoo'], requires: ['sso', 'hr'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '경비 청구·정산. 영수증 첨부, 승인 워크플로우.', actions: [] },
  { id: 'accounting', name: 'Accounting', desc: '회계 · 세금계산서 · 매입매출', base: 'Odoo Accounting', engine: 'odoo', icon: 'calculator', category: 'business', phase: 3, subdomain: null, containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '복식부기 회계. 세금계산서 발행, 매입·매출 관리, 은행 연동, 재무제표.', actions: [] },
  { id: 'approval', name: 'Approval', desc: '전자 결재 · 워크플로우', base: 'Odoo Custom Module', engine: 'odoo', icon: 'checkmark', category: 'business', phase: 3, subdomain: 'approval', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '전자 결재 시스템. 결재 라인, 문서 첨부, 모바일 결재.', actions: [] },
  { id: 'helpdesk', name: 'Helpdesk', desc: '고객 지원 · 티켓 · SLA', base: 'Odoo Custom Module', engine: 'odoo', icon: 'headset', category: 'business', phase: 3, subdomain: 'support', containers: ['polyon-odoo'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '고객 지원 티켓 시스템. SLA 관리, 자동 배정, 지식베이스 연동.', actions: [] },
  /* ══ Intelligence ══ */
  { id: 'workstream', name: 'Workstream', desc: '업무 관리 · 타임라인 · 컨텍스트 엔진', base: 'Custom (Context Engine)', engine: 'polyon-core', icon: 'reportData', category: 'intelligence', phase: 3, subdomain: 'ws', containers: ['app-workstream'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: '업무 중심 그룹웨어. 프로젝트, 태스크, 타임라인, 컨텍스트 엔진.', actions: [] },
  { id: 'ai-agent', name: 'AI Agent', desc: 'LLM 기반 업무 지원 · 자동화', base: 'OpenClaw / Ollama', engine: 'polyon-core', icon: 'bot', category: 'intelligence', phase: 4, subdomain: 'ai', containers: ['app-ai-agent'], requires: ['sso'], status: 'coming-soon', statusLabel: 'Coming Soon', details: 'AI 기반 업무 어시스턴트. 문서 요약, 일정 관리, 업무 자동화.', actions: [] },
];

export const ENGINE_BADGES: Record<string, { label: string; color: string; fg?: string }> = {
  'odoo':          { label: 'Odoo',          color: '#714B67' },
  'stalwart':      { label: 'Stalwart',      color: '#0f62fe' },
  'keycloak':      { label: 'Keycloak',      color: '#4d9de0' },
  'elasticsearch': { label: 'Elasticsearch', color: '#fed10a', fg: '#161616' },
  'polyon-core':   { label: 'Core',          color: '#393939' },
  'mattermost':    { label: 'Mattermost',    color: '#0058CC' },
  'affine':        { label: 'AFFiNE',        color: '#1E96EB' },
  'standalone':    { label: 'Standalone',    color: '#6f6f6f' },
  'external-api':  { label: 'External API',  color: '#8a3ffc' },
};

export const CATEGORIES: Record<string, { label: string }> = {
  homepage:      { label: 'Homepage' },
  platform:      { label: 'Platform' },
  communication: { label: 'Communication' },
  productivity:  { label: 'Productivity' },
  business:      { label: 'Business' },
  intelligence:  { label: 'Intelligence' },
};

export const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  'active':          { bg: '#defbe6', fg: '#198038', label: 'Active' },
  'available':       { bg: '#e0e0e0', fg: '#525252', label: '설치 가능' },
  'requires-setup':  { bg: '#fff8e1', fg: '#b28600', label: '설정 필요' },
  'installing':      { bg: '#d0e2ff', fg: '#0043ce', label: '설치 중...' },
  'stopped':         { bg: '#fff1f1', fg: '#da1e28', label: '중지됨' },
  'error':           { bg: '#fff1f1', fg: '#da1e28', label: 'Error' },
  'coming-soon':     { bg: '#f4f4f4', fg: '#8d8d8d', label: 'Coming Soon' },
  'update-available':{ bg: '#d0e2ff', fg: '#0043ce', label: '업데이트' },
};
