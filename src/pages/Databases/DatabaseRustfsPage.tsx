// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  InlineLoading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tile,
  Tag,
} from '@carbon/react';
import {
  ObjectStorage,
  DataBase,
  Meter,
  Folder,
  Document,
  Folder as StorageIcon,
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (d.getFullYear() <= 1970) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── 통계 카드 ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Tile style={{ minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cds-text-secondary)', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 300 }}>
        {loading ? <InlineLoading description="" style={{ display: 'inline-flex' }} /> : value}
      </div>
    </Tile>
  );
}

export default function DatabaseRustfsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/databases/rustfs/stats');
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const bucketHeaders = [
    { key: 'name', header: '버킷 이름' },
    { key: 'objects', header: '객체 수' },
    { key: 'size', header: '사용량' },
    { key: 'createdAt', header: '생성일' },
  ];

  const bucketRows = (data?.buckets || []).map((b, i) => ({
    id: String(i),
    name: b.name,
    objects: String(b.objects ?? 0),
    size: formatBytes(b.size_bytes),
    createdAt: formatDate(b.createdAt),
  }));

  const statusNode = (() => {
    if (!data) return <InlineLoading description="" />;
    const status = data.status;
    if (status === 'ok') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} /> 온라인</span>;
    if (status === 'error') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ErrorFilled size={16} style={{ color: 'var(--cds-support-error)' }} /> 오프라인</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 불명</span>;
  })();

  return (
    <>
      <PageHeader
        title="RustFS"
        description="S3-compatible 오브젝트 스토리지 모니터링"
      />
      <div style={{ padding: '0 0 24px' }}>
        <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => { setSelectedTab(selectedIndex); if (selectedIndex === 0 || selectedIndex === 1) fetchStats(); }}>
          <TabList contained aria-label="RustFS 탭">
            <Tab>Status</Tab>
            <Tab>Buckets</Tab>
          </TabList>
          <TabPanels>
            {/* Status Tab */}
            <TabPanel>
              <div>
                {/* 통계 카드 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                  <StatCard label="상태" value={statusNode} icon={<DataBase size={16} />} />
                  <StatCard label="버전" value="1.0.0-alpha.85" icon={<ObjectStorage size={16} />} />
                  <StatCard label="엔드포인트" value="polyon-rustfs:9000" icon={<StorageIcon size={16} />} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <StatCard label="총 버킷" value={data?.total_buckets ?? '—'} icon={<Folder size={16} />} loading={loading} />
                  <StatCard label="총 객체 수" value={data ? (data.total_objects ?? 0).toLocaleString() : '—'} icon={<Document size={16} />} loading={loading} />
                  <StatCard label="총 사용량" value={data ? formatBytes(data.total_size_bytes) : '—'} icon={<Meter size={16} />} loading={loading} />
                </div>


              </div>
            </TabPanel>

            {/* Buckets Tab */}
            <TabPanel>
              <div>
                {loading ? (
                  <InlineLoading description="로딩 중..." />
                ) : data && bucketRows.length > 0 ? (
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
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DataTable>
                ) : data ? (
                  <p style={{ color: 'var(--cds-text-helper)', padding: '1rem 0' }}>버킷이 없습니다.</p>
                ) : (
                  <InlineLoading description="로딩 중..." />
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
}
