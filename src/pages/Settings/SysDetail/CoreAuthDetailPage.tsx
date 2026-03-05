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

const ACCENT = '#4d9de0';

export default function CoreAuthDetailPage() {
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
          A
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>PolyON Auth</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>SSO / Authentication</p>
        </div>
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          인증(Authentication)을 전담합니다. '너는 누구인가?'에 답하는 모듈로, Keycloak 기반 OIDC를 통해 모든 PolyON 서비스에 단일 로그인(SSO)을 제공합니다. 인가(Authorization)는 OPA(PolyON Policy)가 담당합니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['Keycloak 26', 'OpenID Connect', 'PKCE', 'JWT', 'JWKS', 'OAuth 2.0'].map(t => (
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
              ['SSO (Single Sign-On)', '한 번의 로그인으로 모든 PolyON 서비스 접근'],
              ['JWT 발급', '사용자 인증 후 서명된 토큰 발급, 서비스 간 신뢰 전달'],
              ['JWKS 공개키', '각 서비스가 토큰을 독립적으로 검증할 수 있는 공개키 제공'],
              ['Forward Auth', 'Traefik과 연동하여 모든 HTTP 요청에 대한 인증 게이트'],
              ['Realm 분리', 'admin(Console 관리자), polyon(Portal 사원) 두 영역 독립 운영'],
              ['PKCE 인증 흐름', 'Public 클라이언트(SPA)를 위한 보안 강화 인증 코드 흐름'],
              ['AD 연동', 'Samba AD DC를 User Federation으로 연결, AD 계정으로 직접 로그인'],
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
            <span>PostgreSQL (세션/설정 저장)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>PolyON Core (Forward Auth), Portal, Grafana, Mattermost, 모든 SSO 연동 앱</span>
          </div>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-auth'],
            ['포트', '8080'],
            ['이미지', 'quay.io/keycloak/keycloak:latest'],
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
