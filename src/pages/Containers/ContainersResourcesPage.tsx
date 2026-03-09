// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  InlineLoading,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';

const RESOURCE_LIMITS = [
  { name: 'polyon-db',         service: 'PostgreSQL 18',    memory: '2G',    notes: '메타데이터 DB' },
  { name: 'polyon-dc',         service: 'PolyON AD DC',     memory: '1G',    notes: 'Active Directory' },
  { name: 'polyon-core',       service: 'PolyON Core',      memory: '512M',  notes: 'FastAPI' },
  { name: 'polyon-redis',      service: 'Redis 7',          memory: '256M',  notes: '캐시/세션' },
  { name: 'polyon-search',         service: 'Elasticsearch 8',  memory: '2G',    notes: '전문 검색 (512MB heap)' },
  { name: 'polyon-rustfs',     service: 'RustFS',           memory: '1G',    notes: 'S3 오브젝트 스토리지' },
  { name: 'polyon-auth',       service: 'Keycloak',         memory: '1G',    notes: 'SSO/OIDC' },
  { name: 'polyon-mail',       service: 'Stalwart',         memory: '512M',  notes: '메일 서버' },
  { name: 'polyon-prometheus', service: 'Prometheus',       memory: '512M',  notes: '메트릭' },
  { name: 'polyon-grafana',    service: 'Grafana',          memory: '256M',  notes: '모니터링 UI' },
  { name: 'polyon-console',         service: 'nginx + Static',   memory: '128M',  notes: 'PolyON Console' },
  { name: 'polyon-pgadmin',    service: 'pgAdmin',          memory: '256M',  notes: 'DB 관리' },
];

const VOLUME_LABELS = {
  'es-data':        { service: 'Elasticsearch', desc: '전문 검색 인덱스' },
  'grafana-data':   { service: 'Grafana',        desc: '대시보드/설정' },
  'polyon-shared':  { service: 'PolyON',         desc: '공유 설정 (.env, setup.json)' },
  'keycloak-data':  { service: 'Keycloak',       desc: 'SSO 데이터 (H2 DB)' },
  'pg-data':        { service: 'PostgreSQL',     desc: '메타데이터 DB' },
  'pgadmin-data':   { service: 'pgAdmin',        desc: 'DB 관리 설정' },
  'prometheus-data':{ service: 'Prometheus',     desc: '메트릭 시계열' },
  'redis-data':     { service: 'Redis',          desc: '캐시/세션' },
  'rustfs-data':    { service: 'RustFS',         desc: 'S3 오브젝트 스토리지' },
  'rustfs-logs':    { service: 'RustFS',         desc: '로그' },
  'samba-conf':     { service: 'PolyON AD DC',   desc: 'AD 설정' },
  'samba-data':     { service: 'PolyON AD DC',   desc: 'AD 데이터' },
  'stalwart-config':{ service: 'Stalwart',       desc: '메일 서버 설정+데이터' },
  'stalwart-data':  { service: 'Stalwart',       desc: '메일 데이터 (RocksDB)' },
};

function parseSize(v) {
  if (!v && v !== 0) return 0;
  if (typeof v === 'number') return v;
  const str = String(v);
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  const s = str.toUpperCase();
  if (s.includes('GB')) return n * 1e9;
  if (s.includes('MB')) return n * 1e6;
  if (s.includes('KB')) return n * 1e3;
  return n;
}

function formatSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) bytes = 0;
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function sizeStyle(v) {
  const bytes = parseSize(v);
  if (bytes >= 5e9) return { color: 'var(--cds-support-error)', fontWeight: 600 };
  if (bytes >= 1e9) return { color: 'var(--cds-support-warning)', fontWeight: 600 };
  return {};
}

export default function ContainersResourcesPage() {
  const [volumes,    setVolumes]    = useState([]);
  const [volLoading, setVolLoading] = useState(true);
  const [volError,   setVolError]   = useState('');
  const [totalBytes, setTotalBytes] = useState(0);

  useEffect(() => {
    const loadVolumes = async () => {
      try {
        const res  = await fetch('/api/v1/containers/volumes');
        const data = await res.json();
        const vols = data.volumes || [];
        setVolumes(vols);
        setTotalBytes(vols.reduce((s, v) => s + parseSize(v.size), 0));
      } catch (e) {
        setVolError(e.message);
      }
      setVolLoading(false);
    };
    loadVolumes();
  }, []);

  // Memory limits DataTable
  const memHeaders = [
    { key: 'service', header: '서비스' },
    { key: 'name',    header: '컨테이너' },
    { key: 'memory',  header: '메모리 제한' },
    { key: 'notes',   header: '비고' },
  ];
  const memRows = RESOURCE_LIMITS.map((l, i) => ({
    id:      String(i),
    service: l.service,
    name:    l.name,
    memory:  l.memory,
    notes:   l.notes,
  }));

  // Volumes DataTable
  const volHeaders = [
    { key: 'volname',  header: '볼륨' },
    { key: 'service',  header: '서비스' },
    { key: 'driver',   header: '드라이버' },
    { key: 'size',     header: '사용량' },
    { key: 'links',    header: '연결' },
    { key: 'desc',     header: '설명' },
  ];
  const volRows = volumes.map((v, i) => {
    const info        = VOLUME_LABELS[v.name] || { service: '—', desc: '' };
    const displaySize = typeof v.size === 'number' ? formatSize(v.size) : (v.size || '—');
    return {
      id:      String(i),
      volname: v.name,
      service: info.service,
      driver:  v.driver,
      size:    displaySize,
      sizeRaw: v.size,        // kept for style calculation
      links:   v.links,
      desc:    info.desc,
    };
  });

  return (
    <div style={{ padding: '0 32px 32px' }}>
      <div style={{ padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>리소스</h1>
        <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>컨테이너 메모리 제한 및 리소스 설정</p>
      </div>

      {/* Memory Limits */}
      <div style={{ marginBottom: '32px' }}>
        <DataTable rows={memRows} headers={memHeaders}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(h => (
                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                      {h.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map(cell => {
                      if (cell.info.header === 'name') {
                        return (
                          <TableCell key={cell.id}>
                            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                              {cell.value}
                            </span>
                          </TableCell>
                        );
                      }
                      if (cell.info.header === 'notes') {
                        return (
                          <TableCell key={cell.id}>
                            <span style={{ color: 'var(--cds-text-secondary)' }}>{cell.value}</span>
                          </TableCell>
                        );
                      }
                      if (cell.info.header === 'service') {
                        return (
                          <TableCell key={cell.id}>
                            <span style={{ fontWeight: 500 }}>{cell.value}</span>
                          </TableCell>
                        );
                      }
                      return <TableCell key={cell.id}>{cell.value}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      </div>

      {/* Volumes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Docker Volumes</h3>
          {totalBytes > 0 && (
            <span style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>
              총 사용량: {formatSize(totalBytes)}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '12px' }}>영구 데이터 볼륨 타입 및 현재 사용량</p>

        {volLoading ? (
          <InlineLoading description="볼륨 정보 로딩 중..." />
        ) : volError ? (
          <div style={{ color: 'var(--cds-support-error)', fontSize: '13px' }}>{volError}</div>
        ) : (
          <DataTable rows={volRows} headers={volHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, ri) => {
                    const rawVol = volumes[ri];
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map(cell => {
                          if (cell.info.header === 'volname') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                                  {cell.value}
                                </span>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'service') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ fontWeight: 500 }}>{cell.value}</span>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'size') {
                            return (
                              <TableCell key={cell.id} style={{ textAlign: 'right' }}>
                                <span style={{
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  fontSize: '12px',
                                  ...sizeStyle(rawVol?.size),
                                }}>
                                  {cell.value}
                                </span>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'links') {
                            return (
                              <TableCell key={cell.id} style={{ textAlign: 'center' }}>
                                {cell.value}
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'desc') {
                            return (
                              <TableCell key={cell.id}>
                                <span style={{ color: 'var(--cds-text-secondary)' }}>{cell.value}</span>
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataTable>
        )}
      </div>
    </div>
  );
}
