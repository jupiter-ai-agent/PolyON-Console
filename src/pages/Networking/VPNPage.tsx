// @ts-nocheck
import { PageHeader } from '../../components/PageHeader';

export default function VPNPage() {
  return (
    <>
      <PageHeader
        title="VPN"
        description="VPN 서비스 관리"
      />
      <div style={{
        background: '#fff', border: '1px solid #e0e0e0',
        padding: '3rem', textAlign: 'center', marginTop: '1.5rem',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>VPN 서비스 미구성</h3>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          VPN 서비스를 사용하려면 WireGuard 또는 OpenVPN 컨테이너를 추가해야 합니다.
          컨테이너 관리 메뉴에서 VPN 서비스를 배포하세요.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '480px', margin: '0 auto' }}>
          {[
            { name: 'WireGuard', desc: '빠른 현대적 VPN 프로토콜', color: '#0f62fe' },
            { name: 'OpenVPN', desc: '검증된 안정적 VPN 솔루션', color: '#24a148' },
          ].map(v => (
            <div key={v.name} style={{
              background: '#f4f4f4', border: `1px solid #e0e0e0`,
              borderLeft: `3px solid ${v.color}`,
              padding: '1rem', textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.name}</div>
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
