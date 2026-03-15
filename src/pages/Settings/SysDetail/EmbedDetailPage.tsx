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

const ACCENT = '#8a3ffc';

export default function EmbedDetailPage() {
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
          AI
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--cds-text-primary)', lineHeight: 1.2 }}>polyon-embed</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>의미 기반 검색 / Semantic Embedding Service</p>
        </div>
      </div>

      {/* Planned 배너 */}
      <div style={{ background: '#f6f2ff', border: '1px solid #8a3ffc', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#491d8b' }}>
        <strong>Planned</strong> — 현재 미구현 상태입니다. 설계가 완료되었으며 향후 배포 예정입니다.
        설계 문서: <a href="https://github.com/jupiter-ai-agent/PolyON-Embed" target="_blank" rel="noopener noreferrer" style={{ color: '#8a3ffc' }}>github.com/jupiter-ai-agent/PolyON-Embed</a>
      </div>

      {/* 개요 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>개요</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
          PP의 의미 기반 검색 인프라입니다. multilingual-e5-base 모델로 텍스트를 768차원 벡터로 변환하여
          OpenSearch k-NN과 결합합니다. 키워드 매칭을 넘어 의미적으로 유사한 문서를 찾는 하이브리드 검색을 제공하며,
          향후 AI Agent의 RAG(Retrieval Augmented Generation) 컨텍스트 공급원으로 활용됩니다.
        </p>
      </Tile>

      {/* 기술 스택 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>기술 스택</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['multilingual-e5-base', 'sentence-transformers', 'FastAPI', 'ONNX Runtime (계획)'].map(t => (
            <Tag key={t} type="gray" size="md">{t}</Tag>
          ))}
        </div>
      </Tile>

      {/* 핵심 기능 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>핵심 기능 (설계)</h3>
        <StructuredListWrapper>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>기능</StructuredListCell>
              <StructuredListCell head>설명</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {[
              ['다국어 임베딩', '한국어/영어 등 100개 언어 텍스트 768차원 벡터 변환'],
              ['E5 Prefix', 'passage/query 구분으로 검색 정확도 최적화 — 비대칭 임베딩'],
              ['Hybrid Search', 'BM25(0.3) + k-NN(0.7) 가중치 조합 — 키워드+의미 결합'],
              ['배치 처리', '최대 100건 동시 임베딩 처리 — 비동기 배치 API'],
              ['모델 캐시', 'RustFS에 모델 파일 영구 저장 — 컨테이너 재시작 시 재다운로드 불필요'],
              ['RAG 기반', 'AI Agent 컨텍스트 공급 — Retrieval Augmented Generation'],
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
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>의존 관계 (설계)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존</span>
            <span>OpenSearch (knn_vector 필드 저장), RustFS (모델 파일 캐시)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span style={{ color: 'var(--cds-text-helper)', minWidth: 100 }}>의존받는 서비스</span>
            <span>Core Search API, 모든 검색 기능 모듈</span>
          </div>
        </div>
      </Tile>

      {/* PP에서의 역할 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>PP에서의 역할 (설계)</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6, fontFamily: "'IBM Plex Mono', monospace" }}>
          문서 색인: 텍스트 → polyon-embed(벡터 변환) → OpenSearch(knn_vector 저장)<br />
          검색 요청: 쿼리 → polyon-embed(벡터화) → OpenSearch(k-NN + BM25) → Core(하이브리드 결과)<br />
          RAG: AI Agent → Core Search → polyon-embed → OpenSearch → 컨텍스트 주입
        </p>
      </Tile>

      {/* 현재 상태 */}
      <Tile style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>현재 상태</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Tag type="purple" size="md">Planned</Tag>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6 }}>
            미구현 상태입니다. 설계 문서 및 아키텍처가 완료되었으며, OpenSearch k-NN 플러그인은 이미 로드되어 있어 배포 준비 상태입니다.
            multilingual-e5-base 모델 선택 및 FastAPI 서버 구현이 완료되면 배포 예정입니다.
          </p>
        </div>
      </Tile>

      {/* 컨테이너 정보 */}
      <Tile>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>컨테이너 정보 (계획)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          {[
            ['컨테이너명', 'polyon-embed'],
            ['포트', '4001'],
            ['이미지', 'jupitertriangles/polyon-embed (예정)'],
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
