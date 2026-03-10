/**
 * OdooFrame — Odoo 관리자 화면을 Console iframe에 표시
 *
 * 흐름:
 * 1. Core API를 통해 Odoo 세션 쿠키를 발급받음 (서버 간 인증)
 * 2. iframe으로 Odoo /web 을 로드 (쿠키 자동 포함)
 *
 * 현재(MVP): 직접 iframe으로 odoo.cmars.com을 열고, 
 * Odoo의 SSO가 Keycloak polyon realm으로 리다이렉트하여 로그인 처리.
 * Console(admin realm)과 다른 realm이므로 별도 로그인이 필요할 수 있음.
 */
import { useState } from 'react';
import { InlineNotification, Button, Link } from '@carbon/react';
import { Renew, Launch } from '@carbon/icons-react';

export default function OdooFrame() {
  const [error, setError] = useState<string | null>(null);

  // odoo.cmars.com을 직접 iframe으로 표시
  // polyon_iframe addon이 X-Frame-Options를 제거하므로 iframe 가능
  const odooUrl = 'https://odoo.cmars.com/web';

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <InlineNotification kind="error" title="Odoo 로딩 실패" subtitle={error} />
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          <Button kind="ghost" size="sm" renderIcon={Renew} onClick={() => setError(null)}>
            재시도
          </Button>
          <Button kind="ghost" size="sm" renderIcon={Launch} href={odooUrl} target="_blank">
            새 탭에서 열기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 48px)' }}>
      <iframe
        src={odooUrl}
        title="Odoo ERP"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        onError={() => setError('iframe 로드 실패. Odoo 서비스 상태를 확인하세요.')}
      />
    </div>
  );
}
