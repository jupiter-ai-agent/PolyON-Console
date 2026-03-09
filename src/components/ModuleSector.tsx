/**
 * ModuleSector — 모듈 UI를 iframe으로 렌더링하는 컨테이너
 *
 * postmessage-protocol-spec.md 준수:
 *   polyon:ready  → polyon:init  → bidirectional → polyon:destroy
 *
 * module-ui-spec.md §4: C 방식 (self-contained iframe)
 *   - 모듈은 자체 UI 번들 (HTML/CSS/JS)을 이미지에 포함
 *   - Console/Portal이 iframe으로 로드
 *   - postMessage로 인증 토큰, 테마, 알림 등 교환
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonText, InlineNotification, Button } from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { getKeycloak } from '../auth/keycloak';
import { useAppStore } from '../store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModuleSectorProps {
  /** 모듈 서비스의 iframe URL (예: /modules/drive/admin/) */
  src: string;
  /** 모듈 ID (로깅/디버그용) */
  moduleId: string;
  /** iframe sandbox 속성 (기본: allow-scripts allow-same-origin allow-forms allow-popups) */
  sandbox?: string;
  /** iframe 최소 높이 */
  minHeight?: string;
  /** 초기 해시 경로 (예: #/settings) */
  hashPath?: string;
}

type SDKMessageType =
  | 'polyon:ready'
  | 'polyon:init'
  | 'polyon:resize'
  | 'polyon:notify'
  | 'polyon:navigate'
  | 'polyon:theme-change'
  | 'polyon:token-refresh'
  | 'polyon:destroy';

interface SDKMessage {
  type: SDKMessageType;
  [key: string]: unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ModuleSector({
  src,
  moduleId,
  sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups',
  minHeight = '600px',
  hashPath,
}: ModuleSectorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);

  // polyon:ready 수신 시 polyon:init 전송
  const sendInit = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const kc = getKeycloak();
    const token = kc?.token || null;
    const user = kc?.tokenParsed
      ? {
          id: kc.tokenParsed.sub || '',
          preferred_username: kc.tokenParsed.preferred_username || '',
          displayName: kc.tokenParsed.name || '',
          email: kc.tokenParsed.email || '',
          isAdmin: !!(
            kc.tokenParsed.isAdmin ||
            kc.tokenParsed.realm_access?.roles?.includes('admin') ||
            kc.tokenParsed.realm_access?.roles?.includes('polyon-admin')
          ),
        }
      : null;

    // 현재 테마 감지 (Carbon의 data-carbon-theme 또는 prefers-color-scheme)
    const theme =
      document.documentElement.getAttribute('data-carbon-theme') === 'g100'
        ? 'dark'
        : 'light';

    const initMessage = {
      type: 'polyon:init',
      token,
      user,
      theme,
      context: {
        moduleId,
        role: 'admin', // Console = admin, Portal = user
        locale: 'ko',
      },
    };

    iframe.contentWindow.postMessage(initMessage, '*');
    setLoading(false);
  }, [moduleId]);

  // postMessage 수신 핸들러
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data as SDKMessage;
      if (!data || typeof data.type !== 'string' || !data.type.startsWith('polyon:')) return;

      // origin 검증: 같은 origin이거나 iframe src의 origin
      // 내부 네트워크이므로 느슨하게 허용 (Phase 2에서 strict origin 검증)

      switch (data.type) {
        case 'polyon:ready':
          // 모듈이 준비됨 → init 전송
          sendInit();
          break;

        case 'polyon:resize':
          // iframe 높이 자동 조절
          if (typeof data.height === 'number' && data.height > 0) {
            setIframeHeight(data.height);
          }
          break;

        case 'polyon:notify':
          // 모듈에서 토스트 알림 요청
          showToast(
            String(data.title || '') + (data.subtitle ? ` — ${data.subtitle}` : ''),
            (data.kind as 'info' | 'success' | 'error' | 'warning') || 'info',
          );
          break;

        case 'polyon:navigate':
          // 크로스-모듈 네비게이션
          if (typeof data.path === 'string') {
            navigate(data.path);
          }
          break;

        default:
          break;
      }
    },
    [sendInit, showToast, navigate],
  );

  // 메시지 리스너 등록/해제
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      // polyon:destroy 전송
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'polyon:destroy' }, '*');
      }
    };
  }, [handleMessage]);

  // 테마 변경 감지 → iframe에 전파
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const theme =
        document.documentElement.getAttribute('data-carbon-theme') === 'g100'
          ? 'dark'
          : 'light';
      iframe.contentWindow.postMessage({ type: 'polyon:theme-change', theme }, '*');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-carbon-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // 토큰 갱신 → iframe에 전파
  useEffect(() => {
    const interval = setInterval(() => {
      const kc = getKeycloak();
      const iframe = iframeRef.current;
      if (!kc?.token || !iframe?.contentWindow) return;

      kc.updateToken(30)
        .then((refreshed) => {
          if (refreshed && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              { type: 'polyon:token-refresh', token: kc.token },
              '*',
            );
          }
        })
        .catch(() => {
          // useAuth에서 처리
        });
    }, 55000); // 55초마다 (Keycloak 토큰 갱신 주기보다 약간 빠르게)

    return () => clearInterval(interval);
  }, []);

  // 5초 타임아웃 — polyon:ready 미수신 시 에러
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('모듈 응답 시간 초과 (5초). 모듈 서비스가 실행 중인지 확인하세요.');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // iframe src 조합
  const iframeSrc = hashPath ? `${src}${hashPath}` : src;

  // 에러 상태
  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <InlineNotification
          kind="error"
          title="모듈 로딩 실패"
          subtitle={error}
        />
        <div style={{ marginTop: '0.5rem' }}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            onClick={() => {
              setError(null);
              setLoading(true);
              const iframe = iframeRef.current;
              if (iframe) {
                iframe.src = iframeSrc;
              }
            }}
          >
            재시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 로딩 스켈레톤 */}
      {loading && (
        <div style={{ padding: '2rem' }}>
          <SkeletonText paragraph lineCount={5} />
        </div>
      )}

      {/* Module iframe */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        sandbox={sandbox}
        title={`${moduleId} module`}
        style={{
          width: '100%',
          height: iframeHeight ? `${iframeHeight}px` : minHeight,
          border: 'none',
          display: loading ? 'none' : 'block',
        }}
        onError={() => {
          setLoading(false);
          setError('iframe 로드 실패. 모듈 서비스 상태를 확인하세요.');
        }}
      />
    </div>
  );
}
