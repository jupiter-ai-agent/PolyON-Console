import { useState, useEffect } from 'react';
import {
  Loading,
  InlineNotification,
  Tag,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  Tile,
} from '@carbon/react';
import { DataBase, ObjectStorage, CheckmarkFilled, WarningFilled, Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { apiFetch } from '../../api/client';

interface StoreEntry {
  name: string;
  backend: string;
  status: string;
  details: string;
}

interface BucketInfo {
  name: string;
  endpoint: string;
  object_count: number;
  total_bytes: number;
  status: string;
}

interface ClaimInfo {
  type: string;
  status: string;
  details?: string;
}

interface StorageOverview {
  stores: StoreEntry[];
  bucket: BucketInfo;
  claims: ClaimInfo[];
  prc_note: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const backendColor: Record<string, string> = {
  'RocksDB (내부)': '#393939',
  'S3 / RustFS': '#0f62fe',
  'OpenSearch': '#6929c4',
  'Redis': '#da1e28',
};

export default function MailStoragePage() {
  const [data, setData] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StorageOverview>('/mail/storage/overview');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
      <PageHeader
        title="메일 스토리지 현황"
        description="Stalwart 메일 서버의 스토리지 구성 및 RustFS 버킷 사용 현황"
      />

      {loading && (
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <Loading description="조회 중..." withOverlay={false} />
        </div>
      )}

      {error && (
        <div style={{ padding: '16px' }}>
          <InlineNotification kind="error" title="오류" subtitle={error} lowContrast />
        </div>
      )}

      {data && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── PRC 상태 ── */}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              PRC 클레임 상태
            </p>
            {data.prc_note && (
              <InlineNotification
                kind="info"
                title="안내"
                subtitle={data.prc_note}
                lowContrast
                style={{ marginBottom: '12px' }}
              />
            )}
            {data.claims.length === 0 ? (
              <Tile style={{ padding: '16px', background: '#262626' }}>
                <p style={{ color: '#8d8d8d', fontSize: '0.875rem' }}>PRC 클레임이 없습니다. 메일 서버는 수동 구성됐습니다.</p>
              </Tile>
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {data.claims.map(c => (
                  <Tile key={c.type} style={{ padding: '16px', background: '#262626', minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {c.status === 'provisioned'
                        ? <CheckmarkFilled size={16} style={{ color: '#24a148' }} />
                        : <WarningFilled size={16} style={{ color: '#f1c21b' }} />}
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.type}</span>
                    </div>
                    <Tag type={c.status === 'provisioned' ? 'green' : 'gray'} size="sm">{c.status}</Tag>
                    {c.details && <p style={{ color: '#8d8d8d', fontSize: '0.75rem', marginTop: '8px' }}>{c.details}</p>}
                  </Tile>
                ))}
              </div>
            )}
          </div>

          {/* ── 스토리지 구성 ── */}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              스토리지 구성
            </p>
            <StructuredListWrapper>
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>용도</StructuredListCell>
                  <StructuredListCell head>Backend</StructuredListCell>
                  <StructuredListCell head>상태</StructuredListCell>
                  <StructuredListCell head>설정값</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {(data.stores ?? []).map((s, i) => (
                  <StructuredListRow key={i}>
                    <StructuredListCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DataBase size={16} />
                        {s.name}
                      </div>
                    </StructuredListCell>
                    <StructuredListCell>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: backendColor[s.backend] || '#393939', color: '#fff'
                      }}>
                        {s.backend}
                      </span>
                    </StructuredListCell>
                    <StructuredListCell>
                      {s.status === 'warn'
                        ? <Tag type="warm-gray" size="sm">권장: S3 전환</Tag>
                        : <Tag type="green" size="sm">정상</Tag>}
                    </StructuredListCell>
                    <StructuredListCell>
                      <code style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>{s.details}</code>
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </div>

          {/* ── S3 버킷 현황 ── */}
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8d8d8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              RustFS 버킷 현황
            </p>
            <Tile style={{ padding: '20px', background: '#262626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ObjectStorage size={20} />
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{data.bucket.name}</span>
                <Tag type={data.bucket.status === 'ok' ? 'green' : 'red'} size="sm">
                  {data.bucket.status}
                </Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginBottom: '4px' }}>엔드포인트</p>
                  <code style={{ fontSize: '0.8rem' }}>{data.bucket.endpoint}</code>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginBottom: '4px' }}>오브젝트 수</p>
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.bucket.object_count.toLocaleString()}</span>
                  <span style={{ color: '#8d8d8d', fontSize: '0.8rem', marginLeft: '4px' }}>개</span>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginBottom: '4px' }}>총 용량</p>
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatBytes(data.bucket.total_bytes)}</span>
                </div>
              </div>
            </Tile>
          </div>

          {/* ── 새로고침 ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={load}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #525252', color: '#c6c6c6', padding: '8px 16px', cursor: 'pointer', borderRadius: '2px', fontSize: '0.875rem' }}
            >
              <Renew size={16} /> 새로고침
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
