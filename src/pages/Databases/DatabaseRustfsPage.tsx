// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Tag,
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
} from '@carbon/react';
import { StatusTag, InfoRow } from './components/DatabaseShared';

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

export default function DatabaseRustfsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/databases/rustfs/stats');
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

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

  return (
    <div className="he-db-page">
      <div className="he-db-page__header">
        <div className="he-db-page__title-row">
          <h2 className="he-db-page__title">RustFS</h2>
          <Tag type="purple">Object Storage</Tag>
        </div>
        <p className="he-db-page__desc">S3-compatible 오브젝트 스토리지 모니터링</p>
      </div>

      <div className="he-db-page__body">
        <Tabs onChange={({ selectedIndex }) => { if (selectedIndex === 0) fetchStats(); if (selectedIndex === 1) fetchStats(); }}>
          <TabList contained aria-label="RustFS 탭">
            <Tab>Status</Tab>
            <Tab>Buckets</Tab>
          </TabList>
          <TabPanels>
            {/* Status Tab */}
            <TabPanel>
              <div className="he-db-status">
                {loading ? (
                  <InlineLoading description="로딩 중..." />
                ) : data ? (
                  <div className="he-db-card">
                    <div className="he-db-card__header">
                      <span className="he-db-card__name">RustFS</span>
                      <StatusTag status={data.status === 'ok' ? 'up' : data.status} />
                    </div>
                    <InfoRow label="버전" value="1.0.0-alpha.85" />
                    <InfoRow label="엔드포인트" value="polyon-rustfs:9000" />
                    <InfoRow label="총 버킷" value={data.total_buckets} />
                    <InfoRow label="총 객체 수" value={(data.total_objects ?? 0).toLocaleString()} />
                    <InfoRow label="총 사용량" value={formatBytes(data.total_size_bytes)} />
                  </div>
                ) : (
                  <p style={{ color: 'var(--cds-text-helper)' }}>Status 탭을 클릭하면 정보를 로드합니다.</p>
                )}
              </div>
            </TabPanel>

            {/* Buckets Tab */}
            <TabPanel>
              <div className="he-db-status">
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
                  <p style={{ color: 'var(--cds-text-helper)' }}>Buckets 탭을 클릭하면 정보를 로드합니다.</p>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
