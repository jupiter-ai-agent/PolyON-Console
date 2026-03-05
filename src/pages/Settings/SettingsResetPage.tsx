// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Checkbox,
  TextInput,
  Button,
  Modal,
  InlineNotification,
  SkeletonText,
  ProgressBar,
} from '@carbon/react';
import { Warning, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

interface ResetTarget {
  id: string;
  label: string;
}

const TARGETS: ResetTarget[] = [
  { id: 'identity',   label: 'ID / 디렉토리' },
  { id: 'auth',       label: '인증 (SSO)' },
  { id: 'mail',       label: '메일' },
  { id: 'storage',    label: '저장소' },
  { id: 'monitoring', label: '모니터링' },
  { id: 'search',     label: '검색 인덱스' },
];

export default function SettingsResetPage() {
  const [status, setStatus] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [isFull, setIsFull] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmText, setConfirmText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [progress, setProgress] = useState<{ value: number; step: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await settingsApi.getSentinelState();
        setStatus((data as { _reset_status?: Record<string, Record<string, unknown>> })._reset_status || {});
      } catch { setStatus({}); }
      finally { setLoading(false); }
    })();
  }, []);

  function toggleTarget(id: string) {
    if (isFull) return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleFull(checked: boolean) {
    setIsFull(checked);
    if (checked) {
      setSelected(new Set(TARGETS.map(t => t.id)));
    } else {
      setSelected(new Set());
    }
  }

  const canExecute = (isFull || selected.size > 0) && confirmText === 'RESET';

  async function executeReset() {
    setShowModal(false);
    setResetting(true);
    setProgress({ value: 5, step: '초기화 시작 중...' });

    try {
      const res = await settingsApi.executeReset();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { detail?: string }).detail || '초기화 실패');
        setResetting(false);
        setProgress(null);
        return;
      }

      if (isFull) {
        // Poll until API comes back
        pollApiReturn();
      } else {
        pollProgress();
      }
    } catch {
      if (isFull) {
        pollApiReturn();
      } else {
        setResetting(false);
        setProgress(null);
      }
    }
  }

  function pollProgress() {
    const timer = setInterval(async () => {
      try {
        const data = await settingsApi.pollResetProgress() as { progress?: number; step?: string; phase?: string; error?: string };
        setProgress({ value: data.progress || 0, step: data.step || '' });
        if (data.phase === 'complete') {
          clearInterval(timer);
          setProgress({ value: 100, step: '초기화 완료' });
          setResetting(false);
        } else if (data.phase === 'error') {
          clearInterval(timer);
          setError('초기화 중 오류: ' + (data.error || ''));
          setResetting(false);
          setProgress(null);
        }
      } catch { /**/ }
    }, 1000);
  }

  function pollApiReturn() {
    setProgress({ value: 50, step: '서비스 재시작 중... (잠시만 기다려주세요)' });
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/sentinel/state');
        if (res.ok) {
          const data = await res.json() as { state?: string };
          if (data.state === 'fresh' || data.state === 'prepared') {
            clearInterval(timer);
            setProgress({ value: 100, step: '초기화가 완료되었습니다.' });
            setTimeout(() => { window.location.href = '/'; }, 1500);
          }
        }
      } catch { /**/ }
    }, 3000);
  }

  const targetNames = isFull
    ? '전체 초기화 (공장 초기화)'
    : Array.from(selected).map(id => TARGETS.find(t => t.id === id)?.label || id).join(', ');

  return (
    <>
      <PageHeader title="시스템 초기화" description="PolyON 플랫폼 데이터를 선택적으로 초기화합니다" />

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} onCloseButtonClick={() => setError('')} style={{ marginBottom: '1rem' }} />
      )}

      <div style={{ maxWidth: 720, marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Warning Banner */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: '#FFF1E6', borderLeft: '3px solid #FF832B' }}>
          <Warning size={20} style={{ flexShrink: 0, color: '#FF832B', marginTop: 2 }} />
          <div style={{ fontSize: '0.8125rem' }}>
            <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다. 초기화 전 <strong>백업</strong>을 권장합니다.
          </div>
        </div>

        {/* Full Reset */}
        <div style={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)', padding: '1.25rem' }}>
          <Checkbox
            id="resetFull"
            labelText={
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>
                  전체 초기화 (공장 초기화)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  모든 데이터 삭제 후 Setup Wizard로 복귀
                </div>
              </div>
            }
            checked={isFull}
            onChange={(_, { checked }) => toggleFull(checked)}
          />
        </div>

        {/* Individual Targets */}
        <div style={{ background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)', padding: '0.5rem 1.25rem' }}>
          {loading ? (
            <SkeletonText paragraph lines={6} />
          ) : (
            TARGETS.map(t => {
              const data = status[t.id] || {};
              return (
                <div key={t.id} style={{ padding: '0.625rem 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                  <Checkbox
                    id={`target-${t.id}`}
                    labelText={
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                          {Object.entries(data)
                            .filter(([k]) => k !== 'error')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ') || '—'}
                          {(data as { error?: string }).error && (
                            <span style={{ color: 'var(--cds-support-error)' }}> ({(data as { error?: string }).error})</span>
                          )}
                        </div>
                      </div>
                    }
                    checked={isFull || selected.has(t.id)}
                    disabled={isFull}
                    onChange={(_, { checked }) => { if (!isFull) toggleTarget(t.id); void checked; }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Confirm input */}
        <div style={{ maxWidth: 400 }}>
          <TextInput
            id="resetConfirm"
            labelText='확인: "RESET" 입력'
            placeholder="RESET"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            kind="danger"
            renderIcon={TrashCan}
            disabled={!canExecute || resetting}
            onClick={() => setShowModal(true)}
          >
            초기화 실행
          </Button>
        </div>

        {/* Progress */}
        {resetting && progress && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem' }}>
              {progress.step}
            </p>
            <ProgressBar
              label=""
              value={progress.value}
              max={100}
              helperText={`${progress.value}%`}
            />
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <Modal
        open={showModal}
        modalHeading="초기화 최종 확인"
        primaryButtonText="초기화 실행"
        secondaryButtonText="취소"
        danger
        onRequestSubmit={executeReset}
        onRequestClose={() => setShowModal(false)}
      >
        <p style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>다음 항목이 초기화됩니다:</p>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#da1e28', margin: '0 0 1rem' }}>{targetNames}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: 0 }}>
          이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?
        </p>
      </Modal>
    </>
  );
}
