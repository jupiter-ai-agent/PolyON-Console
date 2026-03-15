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

const ACCENT = '#198038';

export default function RustFSDetailPage() {
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
          S3
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>RustFS</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>오브젝트 스토리지 / S3-Compatible Storage</p>
        </div>
      </div>

      {/* PP 7원칙 배너 */}
      <div style={{ background: '#defbe6', border: '1px solid #198038', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#0e6027' }}>
        <strong>PP 제7원칙</strong> — 오브젝트 스토리지 단일화. 로컬 PVC 파일 저장 금지. 모든 파일/첨부는 반드시 RustFS에 저장합니다.
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PP 제7원칙의 핵심 인프라입니다. S3 호환 오브젝트 스토리지로, 모든 모듈의 파일과 첨부파일을 저장합니다.
          AWS S3 또는 MinIO SDK를 그대로 사용할 수 있으며, PRC objectStorage claim으로 모듈별 전용 버킷이 자동 생성됩니다.
          Rust로 구현되어 amd64/arm64 네이티브 빌드를 지원합니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['RustFS 1.0.0-alpha', 'S3 API', 'MinIO 호환', 'PRC objectStorage claim'].map(t => (
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
              ['S3 호환 API', 'AWS SDK, MinIO SDK 그대로 사용 가능 — 코드 변경 불필요'],
              ['버킷 격리', 'PRC objectStorage claim으로 모듈별 전용 버킷 자동 생성'],
              ['멀티 플랫폼', 'amd64/arm64 네이티브 빌드 지원'],
              ['Stalwart Blob', '메일 첨부파일 저장 — stalwart-blobs 버킷'],
              ['Odoo 첨부파일', 'ERP 문서/첨부 저장 — erpengine 버킷 (PP 7원칙)'],
              ['백업 저장소', 'DB 백업 파일 장기 보존 — PostgreSQL 자동 백업 대상'],
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
            <span>없음 (독립 운영 — PP 기반 인프라)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>Core, Stalwart, AppEngine (Odoo), AI, 모든 파일 저장 모듈</span>
          </div>
        </div>
      </Tile>

      {/* PP에서의 역할 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>PP에서의 역할</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PP 제7원칙 "로컬 PVC 파일 저장 금지"의 유일한 대안입니다. 모든 모듈은 파일을 로컬 디스크가 아닌 RustFS에 저장해야 합니다.
          PRC objectStorage claim을 선언하면 Core가 전용 버킷과 액세스 키를 자동 생성하고 Secret으로 주입합니다.
          이를 통해 컨테이너 재시작/이전 시에도 파일 데이터가 보존됩니다.
        </p>
      </Tile>

      {/* 현재 상태 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>현재 상태</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Tag type="green" size="md">Active</Tag>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
            RustFS 1.0.0-alpha.85 운영 중입니다. stalwart-blobs, erpengine 버킷 활성화. Console 대시보드(포트 9001)에서 버킷 현황 확인 가능합니다.
          </p>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-rustfs'],
            ['포트', '9000 (API) / 9001 (Console)'],
            ['이미지', 'rustfs/rustfs:1.0.0-alpha.85'],
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
