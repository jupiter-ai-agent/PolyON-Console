import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Tile, 
  Tag, 
  SkeletonText, 
  InlineNotification,
  Button,
  InlineLoading,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  RadioButtonGroup,
  RadioButton
} from '@carbon/react';
import { Add, TrashCan, Download } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';
import { modulesApi } from '../../api/modules';
import { useAppStore } from '../../store/useAppStore';
import InstallProgressModal from '../../components/InstallProgressModal';
import UninstallProgressModal from '../../components/UninstallProgressModal';

interface Component {
  id: string;
  name: string;
  description: string;
  version?: string;
  icon?: string;
  accent?: string;
  status?: string;
  category?: string;
  container_name?: string;
  engine?: string;
}

interface HealthStatus {
  status: string;
  version?: string;
}

interface StatusStyle {
  label: string;
  type: 'green' | 'red' | 'warm-gray' | 'gray' | 'blue';
}

interface InstallModalState {
  open: boolean;
  comp: Component | null;
  imageUrl: string;
  subdomain: string;
  pathPrefix?: string;
}

interface AccessDialogState {
  open: boolean;
  comp: Component | null;
  mode: 'url' | 'subdomain';
  subdomain: string;
  slug?: string;
}

interface UninstallModalState {
  open: boolean;
  component?: Component;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  healthy: { label: 'Healthy', type: 'green' },
  active: { label: 'Active', type: 'green' },
  up: { label: 'Active', type: 'green' }, // K8s에서 올라오는 값
  running: { label: 'Active', type: 'green' }, // K8s에서 올라오는 값
  degraded: { label: 'Degraded', type: 'warm-gray' },
  down: { label: 'Down', type: 'red' },
  stopped: { label: 'Stopped', type: 'red' },
  planned: { label: 'Planned', type: 'gray' },
  disabled: { label: 'Disabled', type: 'red' },
  deployed: { label: 'Deployed', type: 'green' },
  installing: { label: 'Installing', type: 'blue' },
  uninstalling: { label: 'Uninstalling', type: 'blue' },
};

const CATEGORY_LABELS: Record<string, { title: string; desc: string }> = {
  foundation: { title: 'Foundation', desc: 'PolyON 플랫폼 Foundation — Platform · Infrastructure · Capability' },
  engine: { title: 'Service', desc: '사원이 사용하는 업무 서비스 — 모듈 설치/삭제 가능' },
  process: { title: '프로세스', desc: '비즈니스 프로세스 및 업무 자동화 — 모듈 설치/삭제 가능' },
  ai: { title: 'AI', desc: 'AI 에이전트 및 지능 레이어 — 모듈 설치/삭제 가능' },
  monitoring: { title: '모니터링', desc: '관측 및 대시보드' },
};

const DISPLAY_ORDER = ['foundation', 'engine', 'ai', 'process', 'monitoring'];

interface ComponentCardProps {
  comp: Component;
  health?: HealthStatus;
  navigate?: ReturnType<typeof useNavigate>;
  category?: string;
  onInstall?: (comp: Component) => void;
  onUninstall?: (comp: Component) => void;
  isUninstalling?: boolean;
}

function ComponentCard({ 
  comp, 
  health, 
  navigate, 
  category, 
  onInstall, 
  onUninstall,
  isUninstalling = false
}: ComponentCardProps) {
  const accent = comp.accent || '#393939';
  // 상태 결정: health API 결과 우선, 없으면 comp.status(DB 원본) 사용
  const effectiveStatus = health?.status || comp.status || 'planned';
  const compStatusForBadge = comp.status || 'planned';
  const canInstallCheck = compStatusForBadge === 'planned' && !!comp.container_name;
  const showButtonsCheck = !['foundation'].includes(category || '') && ['engine','ai','process','monitoring'].includes(category || '');
  // 설치 버튼이 보이는 모듈(=설치 가능 상태)은 상태 뱃지 숨김 — "Down"이 오류처럼 보이는 문제 방지
  const hideBadge = showButtonsCheck && canInstallCheck;
  const st = hideBadge ? null : (STATUS_STYLES[effectiveStatus] || STATUS_STYLES.planned);
  const isClickable = category === 'foundation' && !!navigate;
  const [hovered, setHovered] = useState(false);
  
  // Foundation 모듈은 삭제 불가 (stalwart=Mail은 engine 카테고리지만 Foundation)
  // Foundation 카테고리 전체가 삭제 불가
  const isFoundationCategory = category === 'foundation';
  const isFoundation = isFoundationCategory;
  const isModuleCategory = ['engine', 'ai', 'process'].includes(category || '');
  const isMonitoringWithModules = category === 'monitoring' && ['prometheus', 'grafana'].includes(comp.id);
  const showButtons = !isFoundation && (isModuleCategory || isMonitoringWithModules);

  // 버튼 결정: comp.status(DB 원본)을 기준으로 판단 — health는 실시간 상태 표시용
  const compStatus = comp.status || 'planned';
  
  // 설치 가능 조건: planned 상태 + container_name이 있어야 함
  const canInstall = compStatus === 'planned' && !!comp.container_name;
  const showInstallButton = showButtons && canInstall;
  const showUninstallButton = showButtons && compStatus === 'active';
  const showPreparingMessage = showButtons && compStatus === 'planned' && !comp.container_name;
  
  // 삭제 중일 때 버튼 비활성화
  const isButtonDisabled = isUninstalling || compStatus === 'installing' || compStatus === 'uninstalling';

  // Planned 상태인 경우 투명도 적용
  const cardOpacity = compStatus === 'planned' ? 0.65 : 1;

  return (
    <div
      onClick={isClickable ? () => navigate?.(`/settings/sysinfo/${comp.id}`) : undefined}
      onMouseEnter={isClickable ? () => setHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setHovered(false) : undefined}
      style={{
        background: '#ffffff',
        border: '1px solid var(--cds-border-subtle)',
        borderLeft: `4px solid ${accent}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,.16)' : '0 1px 3px rgba(0,0,0,.08)',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease',
        opacity: cardOpacity,
      }}>
      <div 
        style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        onClick={(e) => {
          // 버튼 영역 클릭 시 네비게이션 방지
          if (showButtons && e.target !== e.currentTarget) {
            e.stopPropagation();
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, 
            height: 36,
            background: accent + '20',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.125rem',
            color: accent,
            fontWeight: 600,
            borderRadius: '8px',
          }}>
            {comp.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>{comp.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-helper)', marginTop: 1 }}>{comp.description}</div>
          </div>
        </div>
        {st && (
          <Tag type={st.type}>{st.label}</Tag>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--cds-border-subtle)', margin: '0 1.25rem' }} />
      <div style={{ 
        padding: '0.625rem 1.25rem 0.875rem', 
        fontSize: '0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ color: 'var(--cds-text-helper)', fontWeight: 500 }}>버전</span>
          <span style={{ marginLeft: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
            {health?.version || comp.version || '—'}
          </span>
          {comp.engine && (
            <>
              <span style={{ color: 'var(--cds-text-helper)', fontWeight: 500, marginLeft: '0.75rem' }}>—</span>
              <span style={{ color: 'var(--cds-text-helper)', fontWeight: 500, marginLeft: '0.75rem' }}>엔진</span>
              <span style={{ marginLeft: '0.5rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                {comp.engine}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isButtonDisabled && (
            <InlineLoading />
          )}
          {showPreparingMessage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>준비 중</span>
          )}
          {showInstallButton && (
            <Button
              kind="primary"
              size="sm"
              renderIcon={Download}
              disabled={isButtonDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onInstall?.(comp);
              }}
            >
              설치
            </Button>
          )}
          {showUninstallButton && (
            <Button
              kind="danger--ghost"
              size="sm"
              renderIcon={TrashCan}
              disabled={isButtonDisabled}
              onClick={(e) => {
                e.stopPropagation();
                onUninstall?.(comp);
              }}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusSummaryInline({ grouped, healthMap }: { 
  grouped: Record<string, Component[]>; 
  healthMap: Record<string, HealthStatus> 
}) {
  const allComponents = Object.values(grouped).flat();
  const total = allComponents.length;
  
  const statusCounts = allComponents.reduce((acc, comp) => {
    const effectiveStatus = healthMap[comp.id]?.status || comp.status || 'planned';
    const normalizedStatus = STATUS_STYLES[effectiveStatus] ? effectiveStatus : 'planned';
    
    if (['active', 'up', 'running', 'healthy', 'deployed'].includes(normalizedStatus)) {
      acc.active = (acc.active || 0) + 1;
    } else if (normalizedStatus === 'planned') {
      acc.planned = (acc.planned || 0) + 1;
    } else {
      acc.others = (acc.others || 0) + 1;
    }
    
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontWeight: 600 }}>전체 {total}개</span>
      {statusCounts.active && (
        <>
          <span>|</span>
          <Tag type="green">Active {statusCounts.active}</Tag>
        </>
      )}
      {statusCounts.planned && (
        <>
          <span>|</span>
          <Tag type="gray">Planned {statusCounts.planned}</Tag>
        </>
      )}
      {statusCounts.others && (
        <>
          <span>|</span>
          <Tag type="red">기타 {statusCounts.others}</Tag>
        </>
      )}
    </div>
  );
}

function ThirdPartySection({ onRegister }: { onRegister: () => void }) {
  // TODO: 실제 서드파티 모듈 목록이 있을 때 여기에 표시
  const thirdPartyModules: Component[] = [];

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>서드파티 모듈</h4>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--cds-text-helper)' }}>
            PP 규격 Docker 이미지로 모듈을 추가합니다. 이미지에 <code>/polyon-module/module.yaml</code> 포함 필요
          </p>
        </div>
        <Button
          kind="tertiary"
          renderIcon={Add}
          onClick={onRegister}
        >
          모듈 등록
        </Button>
      </div>
      
      {thirdPartyModules.length === 0 && (
        <Tile style={{ textAlign: 'center', padding: '2rem', color: 'var(--cds-text-helper)' }}>
          <div style={{ fontSize: '0.875rem' }}>등록된 서드파티 모듈이 없습니다</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            PP 규격을 준수하는 Docker 이미지를 등록하여 사용할 수 있습니다
          </div>
        </Tile>
      )}
      
      {thirdPartyModules.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {thirdPartyModules.map(comp => (
            <ComponentCard 
              key={comp.id} 
              comp={comp} 
              category="third-party"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsSysinfoPage() {
  const navigate = useNavigate();
  const { showToast, refreshModuleNav } = useAppStore();
  const [grouped, setGrouped] = useState<Record<string, Component[]>>({});
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versionInfo, setVersionInfo] = useState<{ core_version: string; console_version?: string } | null>(null);
  
  // Modal states
  const [uninstallModal, setUninstallModal] = useState<UninstallModalState>({ open: false });
  const [installModal, setInstallModal] = useState<InstallModalState>({ open: false, comp: null, imageUrl: '', subdomain: '' });
  const [accessDialog, setAccessDialog] = useState<AccessDialogState>({ open: false, comp: null, mode: 'url', subdomain: '' });
  const [registerModal, setRegisterModal] = useState(false);
  const [registerImageUrl, setRegisterImageUrl] = useState('');
  const [registerError, setRegisterError] = useState('');

  // 컴포넌트 목록은 즉시 표시, 헬스체크는 비동기 로딩 (스켈레톤 20초 방지)
  const loadComponents = async () => {
    try {
      const data = await settingsApi.getSystemComponents();
      const g: Record<string, Component[]> = {};
      for (const comp of data.components) {
        const cat = comp.category || 'foundation';
        if (!g[cat]) g[cat] = [];
        g[cat].push(comp);
      }
      setGrouped(g);

      // Version info (빠름, 같이 로드)
      try {
        const ver = await settingsApi.getSystemVersion();
        setVersionInfo(ver);
      } catch (err) {
        console.warn('Failed to load version info:', err);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const eng = await settingsApi.getEnginesStatus();
      const hm: Record<string, HealthStatus> = {};
      for (const [k, v] of Object.entries(eng.engines || {})) {
        hm[k] = v as HealthStatus;
      }
      setHealthMap(hm);
    } catch (err) {
      console.warn('Failed to load engines status:', err);
    }
  };

  const loadData = async () => {
    await loadComponents();
    loadHealth(); // 비동기 — await 없이 백그라운드 실행
  };

  useEffect(() => {
    loadData();
  }, []);

  // 이미지 URL 생성 (container_name 기반)
  const generateImageUrl = (comp: Component): string => {
    const cname = comp.container_name || comp.id;
    // container_name이 이미 polyon- prefix → 그대로 사용
    if (cname.startsWith('polyon-')) {
      return `jupitertriangles/${cname}:v1.0.0`;
    }
    return `jupitertriangles/polyon-${cname}:v1.0.0`;
  };

  // 설치 플로우 → 접근 방식 선택 다이얼로그 → 프로그레스 모달
  const handleInstall = (comp: Component) => {
    // 서비스 slug: polyon_apps의 id가 서비스명 (chat, drive, wiki)
    // catalog의 module id (mattermost, nextcloud, affine)와 다름
    const SERVICE_SLUG: Record<string, string> = {
      mattermost: 'chat',
      nextcloud: 'drive',
      affine: 'wiki',
    };
    const slug = SERVICE_SLUG[comp.id] || comp.id;
    setAccessDialog({ open: true, comp, mode: 'url', subdomain: slug, slug });
  };

  const handleAccessConfirm = () => {
    const comp = accessDialog.comp;
    if (!comp) return;
    const imageUrl = generateImageUrl(comp);
    // URL 패턴: subdomain 빈 값 → Core가 PathPrefix Ingress 생성
    // 서브도메인: subdomain 값 전달 → Core가 Host Ingress 생성
    const subdomain = accessDialog.mode === 'subdomain' ? accessDialog.subdomain.trim().toLowerCase() : '';
    const pathPrefix = accessDialog.mode === 'url' ? `/${accessDialog.slug || comp.id}` : '';
    setAccessDialog({ open: false, comp: null, mode: 'url', subdomain: '' });
    setInstallModal({ open: true, comp, imageUrl, subdomain, pathPrefix });
  };

  const handleInstallComplete = (moduleId: string) => {
    setInstallModal({ open: false, comp: null, imageUrl: '', subdomain: '' });
    setHealthMap(prev => ({
      ...prev,
      [moduleId]: { status: 'active' }
    }));
    
    // 메뉴 갱신
    refreshModuleNav();
    
    // 즉시 데이터 로드 후 1초 뒤 한번 더 (K8s 상태 반영 시간)
    loadData();
    setTimeout(() => {
      loadData();
    }, 1000);
  };

  // 삭제 플로우 → 프로그레스 모달 오픈
  const handleUninstall = (comp: Component) => {
    setUninstallModal({ open: true, component: comp });
  };

  const handleUninstallComplete = () => {
    setUninstallModal({ open: false });
    
    // 메뉴 갱신
    refreshModuleNav();
    
    // 즉시 데이터 로드 후 1초 뒤 한번 더 (K8s 상태 반영 시간)
    loadData();
    setTimeout(() => {
      loadData();
    }, 1000);
  };

  // 3rd-party 모듈 등록
  const handleRegisterModule = async () => {
    if (!registerImageUrl.trim()) {
      setRegisterError('이미지 URL을 입력해주세요.');
      return;
    }
    
    try {
      await modulesApi.register(registerImageUrl);
      setRegisterModal(false);
      setRegisterImageUrl('');
      setRegisterError('');
      showToast('모듈 등록 완료', 'success');
      
      // 페이지 리프레시
      await loadData();
    } catch (e) {
      setRegisterError((e as Error).message);
    }
  };

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
          <SkeletonText paragraph />
          <SkeletonText paragraph />
          <SkeletonText paragraph />
        </Tile>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {/* 상단 요약 통계 + 버전 정보 */}
          <Tile style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <StatusSummaryInline grouped={grouped} healthMap={healthMap} />
              {versionInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Tag type="blue">
                    Core {versionInfo.core_version}
                  </Tag>
                  <Tag type="teal">
                    Console {__CONSOLE_VERSION__}
                  </Tag>
                </div>
              )}
            </div>
          </Tile>

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
                    <ComponentCard 
                      key={comp.id} 
                      comp={comp} 
                      health={healthMap[comp.id]} 
                      navigate={navigate} 
                      category={cat}
                      onInstall={handleInstall}
                      onUninstall={handleUninstall}
                      isUninstalling={uninstallModal.open && uninstallModal.component?.id === comp.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* 서드파티 모듈 섹션 */}
          <ThirdPartySection onRegister={() => setRegisterModal(true)} />
        </div>
      )}

      {/* 삭제 프로그레스 모달 */}
      <UninstallProgressModal
        open={uninstallModal.open}
        comp={uninstallModal.component || null}
        onClose={() => setUninstallModal({ open: false })}
        onComplete={handleUninstallComplete}
      />

      {/* 모듈 등록 모달 */}
      <ComposedModal
        open={registerModal}
        onClose={() => {
          setRegisterModal(false);
          setRegisterImageUrl('');
          setRegisterError('');
        }}
        size="sm"
      >
        <ModalHeader>
          <h3>서드파티 모듈 등록</h3>
        </ModalHeader>
        <ModalBody>
          <TextInput
            id="image-url"
            labelText="이미지 URL"
            placeholder="jupitertriangles/polyon-chat:v1.0.0"
            value={registerImageUrl}
            onChange={(e) => {
              setRegisterImageUrl(e.target.value);
              setRegisterError('');
            }}
            invalid={!!registerError}
            invalidText={registerError}
            style={{ marginBottom: '1rem' }}
          />
          {registerError && (
            <InlineNotification
              kind="error"
              title="등록 실패"
              subtitle={registerError}
              hideCloseButton
              style={{ marginTop: '1rem' }}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button 
            kind="secondary" 
            onClick={() => {
              setRegisterModal(false);
              setRegisterImageUrl('');
              setRegisterError('');
            }}
          >
            취소
          </Button>
          <Button kind="primary" onClick={handleRegisterModule}>
            등록
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 접근 방식 선택 다이얼로그 */}
      <ComposedModal
        open={accessDialog.open}
        onClose={() => setAccessDialog({ open: false, comp: null, mode: 'url', subdomain: '' })}
        size="sm"
      >
        <ModalHeader title={`${accessDialog.comp?.name || '모듈'} 설치`} label="접근 방식 설정" />
        <ModalBody>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
            서비스에 접근할 방식을 선택하세요.
          </p>

          <RadioButtonGroup
            legendText="접근 방식"
            name="access-mode"
            valueSelected={accessDialog.mode}
            onChange={(val: string) => setAccessDialog(prev => ({ ...prev, mode: val as 'url' | 'subdomain' }))}
            orientation="vertical"
          >
            <RadioButton
              id="mode-url"
              value="url"
              labelText={`URL 패턴 — portal.${window.location.hostname.split('.').slice(1).join('.') || 'cmars.com'}/${accessDialog.slug || 'app'}`}
            />
            <RadioButton
              id="mode-subdomain"
              value="subdomain"
              labelText="서브도메인 — 별도 도메인으로 서비스"
            />
          </RadioButtonGroup>

          {accessDialog.mode === 'subdomain' && (
            <div style={{ marginTop: '1rem' }}>
              <TextInput
                id="subdomain-input"
                labelText="서브도메인"
                placeholder="chat"
                value={accessDialog.subdomain}
                onChange={(e: any) => setAccessDialog(prev => ({ ...prev, subdomain: e.target.value }))}
                helperText={accessDialog.subdomain ? `https://${accessDialog.subdomain.toLowerCase()}.${window.location.hostname.split('.').slice(1).join('.') || 'cmars.com'}` : ''}
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setAccessDialog({ open: false, comp: null, mode: 'url', subdomain: '' })}>취소</Button>
          <Button
            kind="primary"
            onClick={handleAccessConfirm}
            disabled={accessDialog.mode === 'subdomain' && !accessDialog.subdomain.trim()}
          >
            설치
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 설치 프로그레스 모달 */}
      <InstallProgressModal
        open={installModal.open}
        comp={installModal.comp}
        imageUrl={installModal.imageUrl}
        subdomain={installModal.subdomain}
        pathPrefix={installModal.pathPrefix}
        onClose={() => setInstallModal({ open: false, comp: null, imageUrl: '', subdomain: '' })}
        onComplete={handleInstallComplete}
      />
    </>
  );
}