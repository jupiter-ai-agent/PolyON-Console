import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  InlineLoading,
  RadioButtonGroup,
  RadioButton,
} from '@carbon/react';
import {
  StopOutline,
  TrashCan,
  DataBase,
  Undo,
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
} from '@carbon/icons-react';
import { modulesApi } from '../api/modules';

type StepStatus = 'pending' | 'active' | 'complete' | 'error';

interface Step {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
}

interface Props {
  open: boolean;
  comp: { id: string; name: string } | null;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS: Omit<Step, 'status'>[] = [
  { id: 'stop', label: '서비스 중지', detail: 'K8s 리소스 정리 중...' },
  { id: 'data', label: '데이터 처리', detail: '데이터베이스 처리 중...' },
  { id: 'cleanup', label: '구성 정리', detail: '모듈 등록 정보 삭제 중...' },
];

export default function UninstallProgressModal({ open, comp, onClose, onComplete }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [phase, setPhase] = useState<'confirm' | 'progress' | 'done' | 'error'>('confirm');
  const [dataPolicy, setDataPolicy] = useState<string>('keep');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const startedRef = useRef(false);

  const updateStep = useCallback((index: number, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map((s, i) =>
      i === index ? { ...s, status, ...(detail ? { detail } : {}) } : s
    ));
  }, []);

  const runUninstall = useCallback(async () => {
    if (!comp) return;
    abortRef.current = false;
    setError(null);
    setPhase('progress');
    setSteps(STEPS.map(s => ({ ...s, status: 'pending' as StepStatus })));

    // Step 0: 서비스 중지
    updateStep(0, 'active', 'K8s Deployment, Service, Ingress 삭제 중...');
    await sleep(500);

    try {
      // uninstall API 호출 — 모든 정리를 한번에 수행
      await modulesApi.uninstall(comp.id, dataPolicy);
    } catch (e: any) {
      updateStep(0, 'error', `삭제 실패: ${e.message || '알 수 없는 오류'}`);
      setError(e.message || '삭제 실패');
      setPhase('error');
      return;
    }

    if (abortRef.current) return;
    updateStep(0, 'complete', 'K8s 리소스 삭제 완료');

    // Step 1: 데이터 처리 (이미 API에서 처리됨, UX 표시)
    updateStep(1, 'active');
    await sleep(600);
    if (abortRef.current) return;
    updateStep(1, 'complete', dataPolicy === 'delete' ? '데이터베이스 삭제 완료' : '데이터베이스 보존됨');

    // Step 2: 정리 완료
    updateStep(2, 'active', '모듈 등록 정보 삭제 중...');
    await sleep(400);
    if (abortRef.current) return;
    updateStep(2, 'complete', '모듈 구성 정리 완료');

    setPhase('done');
  }, [comp, dataPolicy, updateStep]);

  useEffect(() => {
    if (open && comp) {
      setPhase('confirm');
      setDataPolicy('keep');
      setError(null);
      startedRef.current = false;
    }
    if (!open) {
      abortRef.current = true;
    }
  }, [open, comp]);

  const handleClose = () => {
    abortRef.current = true;
    if (phase === 'done') {
      onComplete();
    }
    onClose();
  };

  const getStepIcon = (status: StepStatus, index: number) => {
    const icons = [StopOutline, DataBase, TrashCan];
    const Icon = icons[index] || TrashCan;
    if (status === 'complete') return <CheckmarkFilled size={20} style={{ color: 'var(--cds-support-success)' }} />;
    if (status === 'error') return <ErrorFilled size={20} style={{ color: 'var(--cds-support-error)' }} />;
    if (status === 'active') return <InlineLoading style={{ minHeight: 'auto', width: 20 }} />;
    return <Icon size={20} style={{ color: 'var(--cds-text-disabled)' }} />;
  };

  return (
    <ComposedModal open={open} onClose={handleClose} size="sm" preventCloseOnClickOutside={phase === 'progress'}>
      <ModalHeader
        title={phase === 'done' ? `${comp?.name ?? '모듈'} 삭제 완료` :
               phase === 'confirm' ? `${comp?.name ?? '모듈'} 삭제` :
               `${comp?.name ?? '모듈'} 삭제 중`}
        label="Module Uninstallation"
      />
      <ModalBody>
        {phase === 'confirm' && (
          <div style={{ padding: '0.5rem 0' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              background: 'var(--cds-support-warning-inverse)',
              borderRadius: '4px',
              marginBottom: '1.5rem',
            }}>
              <WarningFilled size={20} style={{ color: 'var(--cds-support-warning)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-primary)' }}>
                <strong>{comp?.name}</strong>의 모든 K8s 리소스(Pod, Service, Ingress)가 삭제됩니다.
              </div>
            </div>

            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              데이터베이스 처리
            </div>
            <RadioButtonGroup
              name="data-policy"
              valueSelected={dataPolicy}
              onChange={(value: string) => setDataPolicy(value)}
              orientation="vertical"
            >
              <RadioButton
                id="keep"
                value="keep"
                labelText="데이터베이스 보존 (재설치 시 데이터 유지)"
              />
              <RadioButton
                id="delete"
                value="delete"
                labelText="데이터베이스 삭제 (모든 데이터 영구 삭제)"
              />
            </RadioButtonGroup>
          </div>
        )}

        {(phase === 'progress' || phase === 'done' || phase === 'error') && (
          <div style={{ padding: '1rem 0' }}>
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

            {phase === 'done' && (
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
                    삭제가 완료되었습니다
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-on-color)', opacity: 0.8, marginTop: '0.25rem' }}>
                    {dataPolicy === 'keep' ? '데이터베이스는 보존되었습니다' : '모든 데이터가 삭제되었습니다'}
                  </div>
                </div>
              </div>
            )}

            {phase === 'error' && (
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
                    삭제 중 오류가 발생했습니다
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-on-color)', opacity: 0.8, marginTop: '0.25rem' }}>
                    {error}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {phase === 'confirm' && (
          <>
            <Button kind="secondary" onClick={handleClose}>취소</Button>
            <Button kind="danger" onClick={runUninstall}>삭제 진행</Button>
          </>
        )}
        {phase === 'progress' && (
          <Button kind="secondary" disabled>삭제 진행 중...</Button>
        )}
        {(phase === 'done' || phase === 'error') && (
          <Button kind={phase === 'done' ? 'primary' : 'secondary'} onClick={handleClose}>
            확인
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
