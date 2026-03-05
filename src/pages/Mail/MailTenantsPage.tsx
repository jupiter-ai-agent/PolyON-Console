
import { Tile } from '@carbon/react';
import { Enterprise } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

export default function MailTenantsPage() {
  return (
    <>
      <PageHeader
        title="테넌트 관리"
        description="Stalwart 멀티 테넌트 관리 — Enterprise 전용 기능"
      />

      <Tile style={{ maxWidth: 600, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 16, textAlign: 'center' }}>
          <Enterprise size={48} style={{ color: 'var(--cds-text-secondary)' }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Stalwart Enterprise 라이선스가 필요합니다
          </h3>
          <p style={{ color: 'var(--cds-text-secondary)', margin: 0, lineHeight: 1.6 }}>
            멀티 테넌트 관리는 Stalwart Mail Server Enterprise 플랜에서만 사용할 수 있습니다.
            <br />
            각 테넌트는 독립된 사용자, 도메인, 설정을 가지며 완전히 격리된 환경을 제공합니다.
          </p>
          <div style={{
            background: 'var(--cds-layer-02)',
            borderRadius: 4,
            padding: '16px 24px',
            width: '100%',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--cds-text-primary)' }}>
              Enterprise 기능 포함:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--cds-text-secondary)', fontSize: 13, lineHeight: 1.8 }}>
              <li>무제한 테넌트 생성</li>
              <li>테넌트별 독립 도메인 관리</li>
              <li>테넌트별 사용자 및 그룹 격리</li>
              <li>테넌트별 스토리지 할당량 제어</li>
              <li>중앙 집중식 관리 콘솔</li>
            </ul>
          </div>
          <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', margin: 0 }}>
            라이선스 문의: <a href="https://stalw.art/enterprise" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cds-link-primary)' }}>stalw.art/enterprise</a>
          </p>
        </div>
      </Tile>
    </>
  );
}
