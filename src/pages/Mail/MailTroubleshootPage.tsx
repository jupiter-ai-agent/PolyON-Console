
import { useState, useRef, useEffect } from 'react';
import {
  Button,
  TextInput,
  InlineLoading,
  Tag,
  Tile,
} from '@carbon/react';
import { Search, Stop, CheckmarkFilled, ErrorFilled, WarningFilled, InProgress, CircleDash } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi } from '../../api/mail';

interface TimelineStep {
  id: string;
  timestamp: string;
  type: string;
  status: 'ok' | 'error' | 'warn' | 'info' | 'pending';
  title: string;
  details?: string;
}

function stepIcon(status: TimelineStep['status']) {
  switch (status) {
    case 'ok': return <CheckmarkFilled size={20} style={{ color: 'var(--cds-support-success)', flexShrink: 0 }} />;
    case 'error': return <ErrorFilled size={20} style={{ color: 'var(--cds-support-error)', flexShrink: 0 }} />;
    case 'warn': return <WarningFilled size={20} style={{ color: 'var(--cds-support-warning)', flexShrink: 0 }} />;
    case 'info': return <InProgress size={20} style={{ color: 'var(--cds-interactive)', flexShrink: 0 }} />;
    case 'pending': return <CircleDash size={20} style={{ color: 'var(--cds-text-secondary)', flexShrink: 0 }} />;
    default: return null;
  }
}

function tagType(status: TimelineStep['status']): string {
  switch (status) {
    case 'ok': return 'green';
    case 'error': return 'red';
    case 'warn': return 'orange';
    case 'info': return 'blue';
    default: return 'gray';
  }
}

function parseEvent(data: string): TimelineStep | null {
  try {
    const parsed = JSON.parse(data);
    const type = parsed.type ?? parsed.event ?? 'unknown';
    const status: TimelineStep['status'] =
      parsed.error || parsed.failed ? 'error' :
      parsed.warn || parsed.warning ? 'warn' :
      parsed.completed || parsed.success ? 'ok' : 'info';

    return {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      type,
      status,
      title: parsed.message ?? parsed.description ?? type,
      details: parsed.details ? JSON.stringify(parsed.details).slice(0, 200) : undefined,
    };
  } catch {
    return {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      type: 'raw',
      status: 'info',
      title: data.slice(0, 100),
    };
  }
}

export default function MailTroubleshootPage() {
  const [email, setEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const handleStop = () => {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
    setSteps((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        timestamp: new Date().toLocaleTimeString('ko-KR'),
        type: 'stopped',
        status: 'warn',
        title: '추적이 중지되었습니다.',
      },
    ]);
  };

  const handleStart = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setError('이메일 주소를 입력하세요.'); return; }
    setError(null);
    setSteps([]);
    setRunning(true);

    try {
      const tokenRes = await mailApi.getTroubleshootToken();
      const token = typeof tokenRes.data === 'string' ? tokenRes.data : String(tokenRes.data ?? '');
      const url = `/mail-proxy/troubleshoot/delivery/${encodeURIComponent(trimmed)}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (evt) => {
        const step = parseEvent(evt.data);
        if (step) setSteps((prev) => [...prev, step]);
      };

      es.addEventListener('complete', () => {
        setSteps((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString('ko-KR'),
            type: 'complete',
            status: 'ok',
            title: '추적 완료',
          },
        ]);
        es.close();
        esRef.current = null;
        setRunning(false);
      });

      es.onerror = () => {
        setSteps((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString('ko-KR'),
            type: 'error',
            status: 'error',
            title: '연결 오류 또는 추적 종료',
          },
        ]);
        es.close();
        esRef.current = null;
        setRunning(false);
      };
    } catch (e) {
      setError('추적 시작 실패: ' + (e as Error).message);
      setRunning(false);
    }
  };

  // 언마운트 시 정리
  useEffect(() => () => { esRef.current?.close(); }, []);

  return (
    <>
      <PageHeader
        title="전송 트러블슈팅"
        description="이메일 주소로 메일 전송 흐름을 실시간으로 추적합니다 (SSE 스트림)"
      />

      {/* 입력 영역 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24, maxWidth: 600 }}>
        <TextInput
          id="troubleshoot-email"
          labelText="대상 이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          disabled={running}
          style={{ flex: 1 }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !running) handleStart(); }}
        />
        {running ? (
          <Button kind="danger" renderIcon={Stop} onClick={handleStop}>중지</Button>
        ) : (
          <Button renderIcon={Search} onClick={handleStart} disabled={!email.trim()}>추적 시작</Button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cds-support-error)', fontSize: 13, marginBottom: 16 }}>
          <ErrorFilled size={16} /> {error}
        </div>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <InlineLoading description="실시간 추적 중…" />
        </div>
      )}

      {/* 타임라인 */}
      {steps.length > 0 && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>추적 결과</h3>
            <Tag type="blue" size="sm">{steps.length}단계</Tag>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {steps.map((step, idx) => (
              <Tile key={step.id} style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* 단계 번호 + 아이콘 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 56 }}>
                    <span style={{ fontSize: 11, color: 'var(--cds-text-secondary)', minWidth: 20, textAlign: 'right' }}>
                      {idx + 1}
                    </span>
                    {stepIcon(step.status)}
                  </div>
                  {/* 내용 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{step.title}</span>
                      <Tag type={tagType(step.status) as any} size="sm">{step.type}</Tag>
                      <span style={{ fontSize: 11, color: 'var(--cds-text-secondary)', marginLeft: 'auto' }}>
                        {step.timestamp}
                      </span>
                    </div>
                    {step.details && (
                      <p style={{ fontSize: 11, color: 'var(--cds-text-secondary)', margin: '4px 0 0', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {!running && steps.length === 0 && (
        <Tile style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--cds-text-secondary)' }}>
            <Search size={32} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0 }}>이메일 주소를 입력하고 추적을 시작하세요.</p>
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>
              Stalwart 서버가 해당 주소로의 이메일 전달 과정을 단계별로 추적합니다.
            </p>
          </div>
        </Tile>
      )}
    </>
  );
}
