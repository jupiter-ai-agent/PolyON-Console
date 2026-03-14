import { useEffect, useState } from 'react';
import {
  Tile,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  InlineLoading,
  InlineNotification,
  Tag,
} from '@carbon/react';
import {
  Checkmark,
  Warning,
  DataBase,
  ObjectStorage,
  Email,
  Security,
} from '@carbon/icons-react';
import { apiFetch } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PRCClaim {
  type: string;
  status: string;
  details: string;
}

interface StorageGroup {
  type: string;
  count: number;
  bytes: number;
}

interface ModelGroup {
  model: string;
  count: number;
  bytes: number;
}

interface AttachmentsInfo {
  total_count: number;
  total_bytes: number;
  by_storage: StorageGroup[];
  by_model: ModelGroup[];
}

interface S3Info {
  endpoint: string;
  bucket: string;
  object_count: number;
  total_bytes: number;
  status: string;
  error?: string;
}

interface StorageOverview {
  prc: { claims: PRCClaim[] };
  attachments: AttachmentsInfo;
  s3: S3Info;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val % 1 === 0 ? val : val.toFixed(1)} ${sizes[i]}`;
}

function claimLabel(type: string): string {
  switch (type) {
    case 'database':      return '데이터베이스';
    case 'objectStorage': return '오브젝트 스토리지';
    case 'smtp':          return 'SMTP 메일';
    case 'auth':          return '인증 (Keycloak)';
    default:              return type;
  }
}

function ClaimIcon({ type }: { type: string }) {
  const style = { width: 20, height: 20 };
  switch (type) {
    case 'database':      return <DataBase style={style} />;
    case 'objectStorage': return <ObjectStorage style={style} />;
    case 'smtp':          return <Email style={style} />;
    case 'auth':          return <Security style={style} />;
    default:              return <DataBase style={style} />;
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

const storageTableHeaders = [
  { key: 'type', header: '저장 위치' },
  { key: 'count', header: '파일 수' },
  { key: 'bytes', header: '크기' },
];

const modelTableHeaders = [
  { key: 'model', header: '모델' },
  { key: 'count', header: '파일 수' },
  { key: 'bytes', header: '크기' },
];

export default function AppEngineStoragePage() {
  const [data, setData] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<StorageOverview>('/appengine/storage/overview');
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '데이터 조회 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="스토리지 현황" description="PRC 클레임 및 스토리지 사용량 현황" icon={DataBase} />
        <div style={{ padding: '2rem' }}>
          <InlineLoading description="데이터 조회 중..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="스토리지 현황" description="PRC 클레임 및 스토리지 사용량 현황" icon={DataBase} />
        <div style={{ padding: '1.5rem' }}>
          <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton />
        </div>
      </div>
    );
  }

  const claims = data?.prc?.claims ?? [];
  const attachments = data?.attachments;
  const s3 = data?.s3;

  const storageRows = (attachments?.by_storage ?? []).map((s, i) => ({
    id: String(i),
    type: s.type,
    count: `${s.count.toLocaleString()}개`,
    bytes: s.bytes > 0 ? formatBytes(s.bytes) : '—',
  }));

  const modelRows = (attachments?.by_model ?? [])
    .sort((a, b) => b.count - a.count)
    .map((m, i) => ({
      id: String(i),
      model: m.model,
      count: `${m.count.toLocaleString()}개`,
      bytes: m.bytes > 0 ? formatBytes(m.bytes) : '—',
    }));

  return (
    <div>
      <PageHeader
        title="스토리지 현황"
        description="PRC 리소스 클레임 상태와 AppEngine 스토리지 사용량을 한눈에 확인합니다."
        icon={DataBase}
      />

      <div style={{ padding: '1.5rem' }}>

        {/* ── Section 1: PRC Claims ── */}
        <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>PRC 리소스 클레임</h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {claims.length === 0 ? (
            <p style={{ color: 'var(--cds-text-secondary)' }}>클레임 정보 없음</p>
          ) : (
            claims.map((claim) => (
              <Tile key={claim.type} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClaimIcon type={claim.type} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{claimLabel(claim.type)}</span>
                </div>
                <div>
                  {claim.status === 'provisioned' || claim.status === 'bound' ? (
                    <Tag type="green" renderIcon={Checkmark}>{claim.status}</Tag>
                  ) : (
                    <Tag type="red" renderIcon={Warning}>{claim.status}</Tag>
                  )}
                </div>
                {claim.details && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--cds-text-secondary)', margin: 0, wordBreak: 'break-all' }}>
                    {claim.details}
                  </p>
                )}
              </Tile>
            ))
          )}
        </div>

        {/* ── Section 2: Storage breakdown ── */}
        <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>
          스토리지 사용 현황
          {attachments && (
            <span style={{ fontWeight: 400, fontSize: '0.85rem', marginLeft: '0.75rem', color: 'var(--cds-text-secondary)' }}>
              총 {attachments.total_count.toLocaleString()}개 · {formatBytes(attachments.total_bytes)}
            </span>
          )}
        </h4>
        <div style={{ marginBottom: '2rem' }}>
          <DataTable rows={storageRows} headers={storageTableHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()} size="sm">
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
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        </div>

        {/* ── Section 3: By model ── */}
        {modelRows.length > 0 && (
          <>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>모델별 사용 현황</h4>
            <div style={{ marginBottom: '2rem' }}>
              <DataTable rows={modelRows} headers={modelTableHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()} size="sm">
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
                              <TableCell key={cell.id}>{cell.value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            </div>
          </>
        )}

        {/* ── Section 4: S3 bucket info ── */}
        {s3 && (
          <>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>S3 버킷 현황 (RustFS)</h4>
            <div style={{ marginBottom: '2rem' }}>
              {s3.error && (
                <InlineNotification kind="warning" title="S3 연결 오류" subtitle={s3.error} hideCloseButton style={{ marginBottom: '1rem' }} />
              )}
              <StructuredListWrapper>
                <StructuredListHead>
                  <StructuredListRow head>
                    <StructuredListCell head>항목</StructuredListCell>
                    <StructuredListCell head>값</StructuredListCell>
                  </StructuredListRow>
                </StructuredListHead>
                <StructuredListBody>
                  <StructuredListRow>
                    <StructuredListCell>엔드포인트</StructuredListCell>
                    <StructuredListCell>{s3.endpoint}</StructuredListCell>
                  </StructuredListRow>
                  <StructuredListRow>
                    <StructuredListCell>버킷명</StructuredListCell>
                    <StructuredListCell>{s3.bucket}</StructuredListCell>
                  </StructuredListRow>
                  <StructuredListRow>
                    <StructuredListCell>상태</StructuredListCell>
                    <StructuredListCell>
                      {s3.status === 'ok' ? (
                        <Tag type="green" renderIcon={Checkmark}>정상</Tag>
                      ) : (
                        <Tag type="red" renderIcon={Warning}>{s3.status}</Tag>
                      )}
                    </StructuredListCell>
                  </StructuredListRow>
                  <StructuredListRow>
                    <StructuredListCell>오브젝트 수</StructuredListCell>
                    <StructuredListCell>{s3.object_count.toLocaleString()}개</StructuredListCell>
                  </StructuredListRow>
                  <StructuredListRow>
                    <StructuredListCell>총 용량</StructuredListCell>
                    <StructuredListCell>{s3.total_bytes > 0 ? formatBytes(s3.total_bytes) : '0 B'}</StructuredListCell>
                  </StructuredListRow>
                </StructuredListBody>
              </StructuredListWrapper>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
