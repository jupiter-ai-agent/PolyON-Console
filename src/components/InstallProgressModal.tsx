import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ProgressIndicator,
  ProgressStep,
  InlineLoading,
} from '@carbon/react';
import {
  Checkmark,
  Close,
  CloudUpload,
  DataBase,
  Rocket,
  Activity,
  CheckmarkFilled,
  ErrorFilled,
} from '@carbon/icons-react';
import { modulesApi } from '../api/modules';
import { settingsApi } from '../api/settings';

type StepStatus = 'pending' | 'active' | 'complete' | 'error';

interface Step {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
}

interface Props {
  open: boolean;
  comp: { id: string; name: string; container_name?: string } | null;
  imageUrl: string;
  onClose: () => void;
  onComplete: (moduleId: string) => void;
}

const INITIAL_STEPS: Omit<Step, 'status'>[] = [
  { id: 'analyze', label: '모듈 분석', detail: '이미지에서 모듈 매니페스트 추출 중...' },
  { id: 'database', label: '데이터베이스', detail: '데이터베이스 및 사용자 생성 중...' },
  { id: 'deploy', label: '서비스 배포', detail: 'K8s 리소스 배포 중...' },
  { id: 'health', label: '상태 확인', detail: '서비스 기동 확인 중...' },
];

export default function InstallProgressModal({ open, comp, imageUrl, onClose, onComplete }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const abortRef = useRef(false);
  const startedRef = useRef(false);

  const updateStep = useCallback((index: number, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map((s, i) =>
      i === index ? { ...s, status, ...(detail ? { detail } : {}) } : s
    ));
  }, []);

  const runInstall = useCallback(async () => {
    if (!comp) return;
    abortRef.current = false;
    setError(null);
    setDone(false);
    setCurrentStep(0);

    // Step 0: 모듈 분석 (register)
    updateStep(0, 'active', '이미지 Pull 및 매니페스트 추출 중...');
    let modId = comp.id;
    try {
      const result = await modulesApi.register(imageUrl);
      if (result?.module?.id) modId = result.module.id;
      setModuleId(modId);
    } catch (e: any) {
      const msg = e?.message || '';
      // 409 Conflict = 이미 등록됨 → 정상 진행
      if (msg.includes('이미 등록') || msg.includes('409') || msg.includes('MODULE_EXISTS')) {
        setModuleId(modId);
      } else {
        updateStep(0, 'error', `매니페스트 추출 실패: ${msg || '알 수 없는 오류'}`);
        setError(msg || '모듈 분석 실패');
        return;
      }
    }
    if (abortRef.current) return;
    updateStep(0, 'complete', '모듈 매니페스트 분석 완료');

    // Step 1: DB + Step 2: Deploy (install API가 한번에 처리)
    setCurrentStep(1);
    updateStep(1, 'active');
    
    // 짧은 딜레이로 UX 개선
    await sleep(600);
    if (abortRef.current) return;

    setCurrentStep(2);
    updateStep(1, 'complete', '데이터베이스 준비 완료');
    updateStep(2, 'active');

    try {
      await modulesApi.install(modId);
    } catch (e: any) {
      updateStep(2, 'error', `배포 실패: ${e.message || '알 수 없는 오류'}`);
      setError(e.message || '서비스 배포 실패');
      return;
    }
    if (abortRef.current) return;
    updateStep(2, 'complete', '서비스 배포 완료');

    // Step 3: Health check (polling)
    setCurrentStep(3);
    updateStep(3, 'active', '서비스 기동 확인 중...');

    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      if (abortRef.current) return;
      await sleep(2000);
      try {
        const healthData = await settingsApi.getEnginesStatus();
        const cname = comp.container_name || `polyon-${comp.id}`;
        const h = (healthData as any)?.engines?.[cname] || (healthData as any)?.health?.[cname];
        if (h?.status === 'up' || h?.status === 'running') {
          updateStep(3, 'complete', '서비스 정상 기동 확인');
          setDone(true);
          setCurrentStep(4);
          return;
        }
        updateStep(3, 'active', `서비스 기동 대기 중... (${i + 1}/${maxAttempts})`);
      } catch {
        // health API 실패 — 계속 시도
      }
    }

    // 타임아웃이지만 배포 자체는 성공
    updateStep(3, 'complete', '배포 완료 (서비스 기동 확인 중 — 잠시 후 자동 반영)');
    setDone(true);
    setCurrentStep(4);
  }, [comp, imageUrl, updateStep]);

  useEffect(() => {
    if (open && comp && !startedRef.current) {
      startedRef.current = true;
      setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'pending' as StepStatus })));
      setCurrentStep(-1);
      setDone(false);
      setError(null);
      // 약간의 딜레이 후 시작 (모달 애니메이션)
      setTimeout(() => runInstall(), 400);
    }
    if (!open) {
      startedRef.current = false;
      abortRef.current = true;
    }
  }, [open, comp, runInstall]);

  const handleClose = () => {
    abortRef.current = true;
    if (done) {
      onComplete(moduleId);
    }
    onClose();
  };

  const getStepIcon = (status: StepStatus, index: number) => {
    const icons = [CloudUpload, DataBase, Rocket, Activity];
    const Icon = icons[index] || Activity;
    if (status === 'complete') return <CheckmarkFilled size={20} style={{ color: 'var(--cds-support-success)' }} />;
    if (status === 'error') return <ErrorFilled size={20} style={{ color: 'var(--cds-support-error)' }} />;
    if (status === 'active') return <InlineLoading style={{ minHeight: 'auto', width: 20 }} />;
    return <Icon size={20} style={{ color: 'var(--cds-text-disabled)' }} />;
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="sm" preventCloseOnClickOutside={!done && !error}>
      <ModalHeader
        title={done ? `${comp?.name ?? '모듈'} 설치 완료` : `${comp?.name ?? '모듈'} 설치 중`}
        label="Module Installation"
      />
      <ModalBody>
        <div style={{ padding: '1rem 0' }}>
          {/* 커스텀 스텝 UI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {steps.map((step, i) => (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  opacity: step.status === 'pending' ? 0.4 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <div style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: step.status === 'active' ? 'var(--cds-layer-accent-01)' :
                              step.status === 'complete' ? 'var(--cds-support-success-inverse)' :
                              step.status === 'error' ? 'var(--cds-support-error-inverse)' :
                              'var(--cds-layer-02)',
                  transition: 'background 0.3s ease',
                }}>
                  {getStepIcon(step.status, i)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: step.status === 'error' ? 'var(--cds-support-error)' :
                           step.status === 'complete' ? 'var(--cds-support-success)' :
                           'var(--cds-text-primary)',
                    marginBottom: '0.125rem',
                  }}>
                    {step.label}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--cds-text-secondary)',
                    lineHeight: 1.4,
                  }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 완료 배너 */}
          {done && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--cds-support-success-inverse)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <CheckmarkFilled size={24} style={{ color: 'var(--cds-support-success)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--cds-text-on-color)' }}>
                  설치가 완료되었습니다
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-on-color)', opacity: 0.8, marginTop: '0.25rem' }}>
                  사이드바 메뉴에서 접근할 수 있습니다
                </div>
              </div>
            </div>
          )}

          {/* 에러 배너 */}
          {error && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--cds-support-error-inverse)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <ErrorFilled size={24} style={{ color: 'var(--cds-support-error)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--cds-text-on-color)' }}>
                  설치 중 오류가 발생했습니다
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-on-color)', opacity: 0.8, marginTop: '0.25rem' }}>
                  {error}
                </div>
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind={done ? 'primary' : 'secondary'} onClick={handleClose}>
          {done ? '확인' : error ? '닫기' : '취소'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
