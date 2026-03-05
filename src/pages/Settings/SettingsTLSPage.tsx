import { Tile } from '@carbon/react';
import { Security, Certificate, CheckmarkFilled } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

const CHECKLIST = [
  'nginx 리버스 프록시에 Let\'s Encrypt 인증서 적용',
  'Stalwart ACME 설정 (메일 TLS)',
  'Keycloak HTTPS 활성화',
  'HSTS 헤더 설정',
  '인증서 자동 갱신 크론 설정',
];

export default function SettingsTLSPage() {
  return (
    <>
      <PageHeader
        title="TLS / 인증서"
        description="SSL/TLS 인증서 관리 및 ACME 설정"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Security size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>인증서 상태</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: 0 }}>
            현재 개발 환경에서는 TLS가 비활성화 상태입니다.<br />
            프로덕션 배포 시 Stalwart 내장 ACME 또는 외부 Certbot을 사용하여 인증서를 자동 관리합니다.
          </p>
        </Tile>

        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Certificate size={18} />
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>프로덕션 체크리스트</h4>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {CHECKLIST.map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
                <CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)', flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
        </Tile>
      </div>
    </>
  );
}
