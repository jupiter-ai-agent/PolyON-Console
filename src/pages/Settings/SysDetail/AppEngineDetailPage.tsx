// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import {
  Tile,
  Tag,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';

const ACCENT = '#ba4e00';

export default function AppEngineDetailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* 뒤로가기 */}
      <div
        onClick={() => navigate('/settings/sysinfo')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--cds-link-primary)', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        <span>&#8592;</span>
        <span>시스템 정보</span>
      </div>

      {/* Hero 섹션 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', borderLeft: `4px solid ${ACCENT}`, paddingLeft: '1.25rem' }}>
        <div style={{
          width: 56, height: 56,
          background: ACCENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 700, color: '#ffffff',
          flexShrink: 0,
        }}>
          AE
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>AppEngine</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>비즈니스 애플리케이션 / ERP &amp; HR Platform (Odoo 19)</p>
        </div>
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PP의 비즈니스 애플리케이션 엔진입니다. Odoo 19 기반 ERP/HR/비즈니스 관리 플랫폼으로,
          PRC를 통해 DB/S3/SMTP/OIDC 자원을 자동 프로비저닝합니다. PP 정책 기반으로 운영되며
          polyon_ldap_connector, polyon_s3_attachment 등 PP 전용 Odoo 모듈이 탑재되어 있습니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['Odoo 19', 'Python', 'PostgreSQL', 'polyon_ldap_connector', 'polyon_s3_attachment'].map(t => (
            <Tag key={t} type="gray" size="md">{t}</Tag>
          ))}
        </div>
      </Tile>

      {/* 핵심 기능 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>핵심 기능</h3>
        <StructuredListWrapper>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>기능</StructuredListCell>
              <StructuredListCell head>설명</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {[
              ['LDAP 연동', 'Samba DC로 사용자 인증 — polyon_ldap_connector 정책 기반 import'],
              ['Sync Wizard', 'AD 그룹/사용자 정책 관리 — Group Policy/Include/Exclude 설정'],
              ['S3 첨부파일', 'RustFS erpengine 버킷에 첨부파일 저장 — PP 제7원칙 준수'],
              ['OIDC SSO', 'Keycloak polyon realm으로 싱글 사인온 — AD 계정 통합'],
              ['스케줄러', 'ir.cron 기반 자동화 작업 — 급여, 재고, 보고서 자동 생성'],
              ['PRC 연동', 'database/objectStorage/smtp/auth 4개 클레임 자동 프로비저닝'],
            ].map(([name, desc]) => (
              <StructuredListRow key={name}>
                <StructuredListCell style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</StructuredListCell>
                <StructuredListCell>{desc}</StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      </Tile>

      {/* 의존 관계 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>의존 관계</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존</span>
            <span>PostgreSQL (데이터), RustFS (첨부파일), Keycloak (OIDC), Stalwart (SMTP), Samba DC (LDAP)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>Console AppEngine 메뉴 (관리 UI)</span>
          </div>
        </div>
      </Tile>

      {/* PRC 클레임 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>PRC 클레임 구성</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['database', 'polyon_erp DB 자동 생성 및 접속 정보 주입'],
            ['objectStorage', 'erpengine 버킷 자동 생성, polyon_s3_attachment 모듈 연동'],
            ['smtp', 'Stalwart SMTP 접속 정보 주입 — 메일 발송 자동화'],
            ['auth', 'Keycloak polyon realm OIDC 클라이언트 자동 등록'],
          ].map(([claim, desc]) => (
            <div key={claim} style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: ACCENT, minWidth: 130 }}>{claim}</span>
              <span style={{ color: 'var(--cds-text-secondary)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </Tile>

      {/* 현재 상태 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>현재 상태</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Tag type="green" size="md">Active</Tag>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
            Odoo 19 운영 중입니다. LDAP 연동, S3 첨부파일 저장, OIDC SSO 모두 활성 상태입니다. Console AppEngine 메뉴에서 관리 가능합니다.
          </p>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-appengine'],
            ['포트', '8069'],
            ['이미지', 'jupitertriangles/polyon-appengine'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: '0.75rem' }}>
              <span style={{ color: 'var(--cds-text-helper)', minWidth: 80 }}>{label}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
            </div>
          ))}
        </div>
      </Tile>

    </div>
  );
}
