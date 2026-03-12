import { useEffect, useRef, useState } from 'react';
import { Loading } from '@carbon/react';
import { useAuth } from '../../auth/useAuth';

// apps-admin.cmars.com: 관리자 전용 서브도메인 (쿠키 분리)
// apps.cmars.com: 일반 사원용 (polyon realm)
const APPENGINE_HOST = 'https://apps-admin.cmars.com';

export default function AppEnginePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    // Console의 admin realm access_token으로 Odoo 세션 직접 생성
    fetch(`${APPENGINE_HOST}/polyon/oidc/admin/token-auth`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) {
          setIframeSrc(`${APPENGINE_HOST}/web`);
        } else {
          res.json().then(d => setError(`인증 실패: ${d.error || res.status}`)).catch(() => setError(`인증 실패 (HTTP ${res.status})`));
          setLoading(false);
        }
      })
      .catch(err => {
        setError(`AppEngine 연결 실패: ${err.message}`);
        setLoading(false);
      });
  }, [token]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#161616', zIndex: 10,
        }}>
          <Loading description="AppEngine 연결 중..." withOverlay={false} />
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#161616', color: '#fa4d56', zIndex: 10, gap: '12px',
        }}>
          <span style={{ fontSize: '1rem' }}>{error}</span>
          <button
            style={{ padding: '8px 16px', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => { setError(null); setLoading(true); setIframeSrc(null); }}
          >
            재시도
          </button>
        </div>
      )}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          allow="fullscreen"
          onLoad={() => setLoading(false)}
          title="AppEngine 관리"
        />
      )}
    </div>
  );
}
