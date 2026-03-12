import { useRef, useState } from 'react';
import { Loading } from '@carbon/react';

const APPENGINE_ADMIN_URL = 'https://apps.cmars.com:1120/polyon/oidc/admin/login?redirect=/web';

export default function AppEnginePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#161616', zIndex: 10,
        }}>
          <Loading description="AppEngine 로딩 중..." withOverlay={false} />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={APPENGINE_ADMIN_URL}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="fullscreen"
        onLoad={() => setLoading(false)}
        title="AppEngine 관리"
      />
    </div>
  );
}
