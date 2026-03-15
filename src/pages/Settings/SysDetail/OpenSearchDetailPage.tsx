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

const ACCENT = '#6929c4';

export default function OpenSearchDetailPage() {
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
          OS
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>OpenSearch</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>통합 검색 엔진 / Full-Text Search &amp; k-NN</p>
        </div>
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PP의 통합 검색 및 로그 분석 엔진입니다. 메일 전문검색(FTS)을 현재 지원하며, 향후 polyon-embed와 연동하여
          의미 기반 벡터 검색(k-NN)을 제공할 예정입니다. Lucene 기반의 BM25 키워드 검색과
          HNSW/FAISS 알고리즘의 k-NN 검색을 결합한 하이브리드 검색이 목표입니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['OpenSearch 3.x', 'Lucene', 'k-NN (HNSW/FAISS)', 'BM25', 'PRC search claim'].map(t => (
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
              ['메일 FTS', 'Stalwart 메일 본문/제목 전문검색 — st_email 인덱스 사용'],
              ['k-NN 검색', 'polyon-embed와 연동한 의미 기반 벡터 검색 (계획)'],
              ['하이브리드 검색', 'BM25(키워드) + k-NN(의미) 결합 — 정확도 향상'],
              ['모듈별 인덱스', 'polyon_{module} 네이밍으로 모듈 간 인덱스 격리'],
              ['PRC 연동', 'search claim으로 모듈이 인덱스 자동 생성 및 관리'],
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
            <span>없음 (독립 운영)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>Stalwart (FTS), Core (검색 API), 향후 모든 모듈</span>
          </div>
        </div>
      </Tile>

      {/* PP에서의 역할 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>PP에서의 역할</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          현재는 Stalwart 메일 FTS 전용으로 운영 중입니다. Stalwart가 메일 수신/발신 시 st_email 인덱스에 자동 색인하며,
          Core Search API가 이를 조회합니다. 향후 polyon-embed가 배포되면 knn_vector 필드를 추가하여
          의미 기반 하이브리드 검색으로 업그레이드됩니다.
        </p>
      </Tile>

      {/* 현재 상태 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>현재 상태</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Tag type="green" size="md">Active</Tag>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
            OpenSearch 3.x 운영 중입니다. 메일 FTS(st_email 인덱스) 활성화 상태이며, k-NN 플러그인이 로드되어 있어 향후 벡터 검색 확장이 가능합니다.
          </p>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-search'],
            ['포트', '9200'],
            ['이미지', 'opensearchproject/opensearch:3.x'],
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
