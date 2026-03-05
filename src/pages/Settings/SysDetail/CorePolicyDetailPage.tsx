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

const ACCENT = '#7d4e00';

export default function CorePolicyDetailPage() {
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
          P
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>PolyON Policy</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>Authorization / Policy Engine</p>
        </div>
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PolyON 제3원칙 — 통제와 감사(Governance &amp; Audit)의 핵심입니다. 인가(Authorization)를 전담하여 '너는 무엇을 할 수 있는가?'에 답합니다.
          Open Policy Agent(OPA)를 기반으로 모든 리소스 접근을 정책(Policy)에 의해 제어합니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['Open Policy Agent', 'Rego', 'REST API', 'RBAC', 'Decision Log'].map(t => (
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
              ['RBAC 정책', 'AD 그룹 기반 역할 매핑 — admin, manager, member, viewer 4단계'],
              ['실시간 정책 평가', '모든 API 요청에 대해 3ms 이내 allow/deny 판정'],
              ['정책 핫 리로드', '서비스 재시작 없이 Rego 정책 파일 변경 즉시 반영'],
              ['Decision Log', '모든 정책 판정 결과를 기록, 감사 추적 가능'],
              ['Fail-Open 설계', 'OPA 장애 시 서비스 중단 없이 허용 모드로 전환'],
              ['조건부 접근 제어', '시간, IP, 경로, HTTP 메서드 조합의 세밀한 정책 정의 가능'],
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
            <span>Keycloak (JWT의 groups claim을 소비)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>PolyON Core (Forward Auth에서 정책 평가 호출)</span>
          </div>
        </div>
      </Tile>

      {/* 요청 흐름 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>요청 흐름</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6, fontFamily: "'IBM Plex Mono', monospace" }}>
          사용자 → Traefik(제5원칙) → Core(Forward Auth) → OPA 정책 평가 → allow/deny → 서비스 → 감사 로그
        </p>
      </Tile>

      {/* 현재 상태 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>현재 상태</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Tag type="blue" size="md">Planned</Tag>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
            현재 fail-open 모드로 운영 중입니다. 기본 RBAC 정책이 로드되어 있으며, 향후 Console에서 정책 관리 UI가 추가될 예정입니다.
          </p>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-opa'],
            ['포트', '8181'],
            ['이미지', 'openpolicyagent/opa:latest'],
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
