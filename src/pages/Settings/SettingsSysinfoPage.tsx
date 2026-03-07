// @ts-nocheck
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
  TextInput
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
  engine:     { title: '앱 엔진',   desc: '사원이 사용하는 업무 서비스 — 모듈 설치/삭제 가능' },
  process:    { title: '프로세스',  desc: '비즈니스 프로세스 및 업무 자동화 — 모듈 설치/삭제 가능' },
  ai:         { title: 'AI',        desc: 'AI 에이전트 및 지능 레이어 — 모듈 설치/삭제 가능' },
  infra:      { title: '인프라',    desc: '데이터베이스, 스토리지, 네트워크' },
  monitoring: { title: '모니터링', desc: '관측 및 대시보드' },
};

const DISPLAY_ORDER = ['core', 'infra', 'engine', 'ai', 'process', 'monitoring'];

function ComponentCard({ comp, health, navigate, category, onInstall, onUninstall }: { 
  comp: Component; 
  health?: HealthStatus; 
  navigate?: ReturnType<typeof useNavigate>; 
  category?: string;
  onInstall?: (comp: Component) => void;
  onUninstall?: (comp: Component) => void;
}) {
  const accent = comp.accent || '#393939';
  // 상태 결정: health API 결과 우선, 없으면 comp.status(DB 원본) 사용
  const effectiveStatus = health?.status || comp.status || 'planned';
  const st = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.planned;
  const isClickable = category === 'core' && !!navigate;
  const [hovered, setHovered] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  // 버튼을 표시할 카테고리인지 확인
  // Foundation 모듈은 삭제 불가 (stalwart=Mail은 engine 카테고리지만 Foundation)
  const FOUNDATION_IDS = ['stalwart', 'postgresql', 'redis', 'opensearch', 'rustfs', 'traefik', 'polyon-dc', 'keycloak', 'polyon-core', 'polyon-console'];
  const isFoundation = FOUNDATION_IDS.includes(comp.id);
  const isModuleCategory = ['engine', 'ai', 'process'].includes(category || '');
  const isMonitoringWithModules = category === 'monitoring' && ['prometheus', 'grafana'].includes(comp.id);
  const showButtons = !isFoundation && (isModuleCategory || isMonitoringWithModules);

  // 버튼 결정: comp.status(DB 원본)을 기준으로 판단 — health는 실시간 상태 표시용
  const compStatus = comp.status || 'planned';
  const showInstallButton = showButtons && compStatus === 'planned';
  const showUninstallButton = showButtons && compStatus === 'active';
  const showLoading = buttonLoading || compStatus === 'installing' || compStatus === 'uninstalling';

  const handleInstall = async () => {
    if (!onInstall || buttonLoading) return;
    setButtonLoading(true);
    try {
      await onInstall(comp);
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (!onUninstall || buttonLoading) return;
    setButtonLoading(true);
    try {
      await onUninstall(comp);
    } finally {
      setButtonLoading(false);
    }
  };

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
        </div>
        {showLoading && (
          <InlineLoading style={{ marginLeft: '0.5rem' }} />
        )}
        {showInstallButton && (
          <Button
            kind="primary"
            size="sm"
            renderIcon={Download}
            onClick={(e) => {
              e.stopPropagation();
              handleInstall();
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
            onClick={(e) => {
              e.stopPropagation();
              handleUninstall();
            }}
          >
            삭제
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SettingsSysinfoPage() {
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [grouped, setGrouped] = useState<Record<string, Component[]>>({});
  const [healthMap, setHealthMap] = useState<Record<string, HealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [uninstallModal, setUninstallModal] = useState<{ open: boolean; component?: Component }>({ open: false });
  const [installModal, setInstallModal] = useState<{ open: boolean; comp: any; imageUrl: string }>({ open: false, comp: null, imageUrl: '' });
  const [registerModal, setRegisterModal] = useState(false);
  const [registerImageUrl, setRegisterImageUrl] = useState('');
  const [registerError, setRegisterError] = useState('');

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  // 이미지 URL 생성 (container_name 기반)
  const generateImageUrl = (comp: any): string => {
    const cname = comp.container_name || comp.id;
    // container_name이 이미 polyon- prefix → 그대로 사용
    if (cname.startsWith('polyon-')) {
      return `jupitertriangles/${cname}:v1.0.0`;
    }
    return `jupitertriangles/polyon-${cname}:v1.0.0`;
  };

  // 설치 플로우 → 프로그레스 모달 오픈
  const handleInstall = (comp: Component) => {
    const imageUrl = generateImageUrl(comp);
    setInstallModal({ open: true, comp, imageUrl });
  };

  const handleInstallComplete = (moduleId: string) => {
    setInstallModal({ open: false, comp: null, imageUrl: '' });
    setHealthMap(prev => ({
      ...prev,
      [moduleId]: { status: 'active' }
    }));
    loadData(); // 전체 새로고침
  };

  // 삭제 플로우 → 프로그레스 모달 오픈
  const handleUninstall = (comp: Component) => {
    setUninstallModal({ open: true, component: comp });
  };

  const handleUninstallComplete = () => {
    setUninstallModal({ open: false });
    loadData();
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
                    <ComponentCard 
                      key={comp.id} 
                      comp={comp} 
                      health={healthMap[comp.id]} 
                      navigate={navigate} 
                      category={cat}
                      onInstall={handleInstall}
                      onUninstall={handleUninstall}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* 서드파티 모듈 섹션 */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>서드파티 모듈</h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--cds-text-helper)' }}>
                  PP 규격을 준수하는 Docker 이미지로 모듈을 추가합니다
                </p>
              </div>
              <Button
                kind="tertiary"
                renderIcon={Add}
                onClick={() => setRegisterModal(true)}
              >
                모듈 등록
              </Button>
            </div>
          </div>
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

      {/* 설치 프로그레스 모달 */}
      <InstallProgressModal
        open={installModal.open}
        comp={installModal.comp}
        imageUrl={installModal.imageUrl}
        onClose={() => setInstallModal({ open: false, comp: null, imageUrl: '' })}
        onComplete={handleInstallComplete}
      />
    </>
  );
}
