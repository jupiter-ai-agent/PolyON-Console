// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Tag,
  InlineLoading,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tile,
  InlineNotification,
} from '@carbon/react';
import { Renew, ObjectStorage } from '@carbon/icons-react';
import { StatusTag, InfoRow } from './components/DatabaseShared';

interface BucketInfo {
  name: string;
  createdAt: string;
  objects: number;
  size_bytes: number;
}

interface RustFSStats {
  status: string;
  total_buckets: number;
  total_objects: number;
  total_size_bytes: number;
  buckets: BucketInfo[];
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function DatabaseRustfsPage() {
  const [data, setData] = useState<RustFSStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/databases/rustfs/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'RustFS 연결 실패');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const bucketHeaders = [
    { key: 'name', header: '버킷 이름' },
    { key: 'objects', header: '객체 수' },
    { key: 'size', header: '사용량' },
    { key: 'createdAt', header: '생성일' },
  ];

  const bucketRows = (data?.buckets || []).map((b, i) => ({
    id: String(i),
    name: b.name,
    objects: b.objects.toLocaleString(),
    size: formatBytes(b.size_bytes),
    createdAt: formatDate(b.createdAt),
  }));

  return (
    <div className="he-db-page">
      <div className="he-db-page__header">
        <div className="he-db-page__title-row">
          <h2 className="he-db-page__title">RustFS</h2>
          <Tag type="purple">Object Storage</Tag>
        </div>
        <p className="he-db-page__desc">S3-compatible 오브젝트 스토리지 — 버킷 현황 및 모니터링</p>
      </div>

      <div className="he-db-page__body">
        {/* Status Overview */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>서비스 상태</h4>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Renew}
              onClick={fetchStats}
              disabled={loading}
            >
              새로고침
            </Button>
          </div>

          {loading && <InlineLoading description="로딩 중..." />}

          {error && (
            <InlineNotification
              kind="error"
              title="연결 실패"
              subtitle={error}
              lowContrast
              hideCloseButton
            />
          )}

          {data && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <Tile style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>
                  상태
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <StatusTag status={data.status === 'ok' ? 'up' : data.status} />
                </div>
              </Tile>

              <Tile style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>
                  버킷
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                  {data.total_buckets}
                </div>
              </Tile>

              <Tile style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>
                  총 객체 수
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                  {data.total_objects.toLocaleString()}
                </div>
              </Tile>

              <Tile style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>
                  총 사용량
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                  {formatBytes(data.total_size_bytes)}
                </div>
              </Tile>
            </div>
          )}
        </div>

        {/* Bucket Table */}
        {data && data.buckets && data.buckets.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>버킷 목록</h4>
            <DataTable rows={bucketRows} headers={bucketHeaders} isSortable>
              {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                <Table {...getTableProps()} size="lg">
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>
                            {cell.info.header === 'name' ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ObjectStorage size={16} />
                                <strong>{cell.value}</strong>
                              </span>
                            ) : (
                              cell.value
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          </div>
        )}

        {data && data.buckets && data.buckets.length === 0 && (
          <Tile style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-helper)' }}>
            버킷이 없습니다. 모듈 설치 시 자동으로 생성됩니다.
          </Tile>
        )}
      </div>
    </div>
  );
}
