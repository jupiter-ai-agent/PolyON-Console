// @ts-nocheck
/**
 * Dashboard — Service Status Card (Row 5)
 * Carbon Tile + Tag + DataTable 사용
 * 파이프라인 뷰는 SVG 직접 렌더링 유지
 */
import { useEffect, useRef, useState } from 'react';
import {
  Tile,
  SkeletonText,
  Tag,
  InlineNotification,
  IconButton,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import {
  Application,
  Catalog,
  DataBase,
  Activity,
  Meter,
  Report,
  SearchLocate,
  Email,
  Locked,
  Network_4,
  ContainerSoftware,
  Plug,
  ObjectStorage,
  Settings,
} from '@carbon/icons-react';
import { dashboardApi, type ContainerInfo } from '../../../api/dashboard';

// ── 서비스 카탈로그 ────────────────────────────────────────────────────────

interface ServiceMeta {
  name: string;
  desc: string;
  color: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const SERVICE_CATALOG: Record<string, ServiceMeta> = {
  api:              { name: 'PolyON Core',       desc: 'PolyON AD 래핑 백엔드',      color: '#0f62fe', Icon: Application },
  db:               { name: 'PostgreSQL',        desc: '공유 관계형 DB (v18)',       color: '#336791', Icon: DataBase },
  dc:               { name: 'Domain Controller', desc: 'Samba 4 Active Directory', color: '#8a3ffc', Icon: Network_4 },
  elasticvue:       { name: 'Elasticvue',        desc: 'Elasticsearch 관리 콘솔',   color: '#f4c542', Icon: SearchLocate },
  es:               { name: 'Elasticsearch',     desc: '전문 검색 v8.17',           color: '#fed10a', Icon: SearchLocate },
  'es-exporter':    { name: 'ES Exporter',       desc: 'ES 메트릭 수집기',          color: '#e6550d', Icon: Meter },
  grafana:          { name: 'Grafana',           desc: '통합 모니터링 대시보드',     color: '#f46800', Icon: Activity },
  keycloak:         { name: 'Keycloak',          desc: 'SSO / OIDC / SAML / MFA', color: '#4d4d4d', Icon: Locked },
  mail:             { name: 'Stalwart Mail',     desc: '메일 · 캘린더 · 연락처',    color: '#0043ce', Icon: Email },
  'pg-exporter':    { name: 'PG Exporter',       desc: 'PostgreSQL 메트릭 수집기',  color: '#336791', Icon: Meter },
  pgadmin:          { name: 'pgAdmin',           desc: 'PostgreSQL 웹 관리',        color: '#336791', Icon: Report },
  prometheus:       { name: 'Prometheus',        desc: '메트릭 수집 · 알림',        color: '#e6522c', Icon: Activity },
  redis:            { name: 'Redis',             desc: '캐시 · 세션 · Rate Limit', color: '#d82c20', Icon: Plug },
  redisinsight:     { name: 'RedisInsight',      desc: 'Redis 웹 관리 콘솔',        color: '#d82c20', Icon: Meter },
  'redis-exporter': { name: 'Redis Exporter',    desc: 'Redis 메트릭 수집기',       color: '#d82c20', Icon: Meter },
  rustfs:           { name: 'RustFS',            desc: 'S3 호환 오브젝트 스토리지', color: '#dea584', Icon: ObjectStorage },
  sentinel:         { name: 'Sentinel',          desc: 'NanoClaw 엣지 모니터링',    color: '#6929c4', Icon: Settings },
  traefik:          { name: 'Traefik',           desc: '리버스 프록시 · HTTPS GW', color: '#24a1c1', Icon: Settings },
  ui:               { name: 'Admin Console',     desc: 'PolyON 관리 콘솔 (nginx)', color: '#0f62fe', Icon: ContainerSoftware },
};

// ── 파이프라인 레이어 ─────────────────────────────────────────────────────

const PIPELINE_LAYERS: Record<string, { layer: number; label: string }> = {
  db:               { layer: 0, label: 'PostgreSQL' },
  redis:            { layer: 0, label: 'Redis' },
  es:               { layer: 0, label: 'Elasticsearch' },
  rustfs:           { layer: 0, label: 'RustFS' },
  'pg-exporter':    { layer: 1, label: 'PG Exporter' },
  'redis-exporter': { layer: 1, label: 'Redis Exporter' },
  'es-exporter':    { layer: 1, label: 'ES Exporter' },
  prometheus:       { layer: 1, label: 'Prometheus' },
  dc:               { layer: 2, label: 'Samba DC' },
  auth:             { layer: 2, label: 'Keycloak' },
  core:             { layer: 3, label: 'PolyON Core' },
  mail:             { layer: 3, label: 'Stalwart Mail' },
  operator:         { layer: 3, label: 'Operator' },
  ui:               { layer: 4, label: 'Admin Console' },
  grafana:          { layer: 4, label: 'Grafana' },
  pgadmin:          { layer: 4, label: 'pgAdmin' },
  redisinsight:     { layer: 4, label: 'RedisInsight' },
  elasticvue:       { layer: 4, label: 'Elasticvue' },
  proxy:            { layer: 5, label: 'Traefik' },
};

const LAYER_LABELS = ['데이터 저장소', '메트릭 수집', '인증/디렉토리', '핵심 서비스', '앱/관리 UI', '프록시'];
const LAYER_COLORS = ['#e8f5e9', '#fff3e0', '#f3e5f5', '#e3f2fd', '#fce4ec', '#e0f2f1'];

// ── 상태 유틸 ─────────────────────────────────────────────────────────────

function getStatus(c: ContainerInfo): { color: string; text: string; healthy: boolean } {
  const isRunning = c.state === 'running';
  const healthMatch = c.status.match(/\((healthy|unhealthy)\)/);
  const healthy = healthMatch ? healthMatch[1] === 'healthy' : isRunning;
  return {
    healthy,
    color: healthy ? '#198038' : isRunning ? '#f1c21b' : '#da1e28',
    text: healthy ? '실행 중' : isRunning ? '비정상' : '중지됨',
  };
}

function getTagType(healthy: boolean, running: boolean) {
  if (healthy) return 'green';
  if (running) return 'yellow';
  return 'red';
}

function parseKey(name: string) {
  return name.replace('polyon-', '');
}

type ViewMode = 'grid' | 'list' | 'pipeline';

// ── 파이프라인 SVG 뷰 ─────────────────────────────────────────────────────

function PipelineView({ containers, metrics }: { containers: ContainerInfo[]; metrics: Record<string, string[]> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const statusMap: Record<string, { healthy: boolean; running: boolean }> = {};
  for (const c of containers) {
    const key = parseKey(c.name);
    const isRunning = c.state === 'running';
    const healthMatch = c.status.match(/\((healthy|unhealthy)\)/);
    const healthy = healthMatch ? healthMatch[1] === 'healthy' : isRunning;
    statusMap[key] = { running: isRunning, healthy };
  }

  const activeKeys = new Set(containers.map(c => parseKey(c.name)));

  const layerNodes: Record<number, string[]> = {};
  for (const [key, node] of Object.entries(PIPELINE_LAYERS)) {
    if (!activeKeys.has(key)) continue;
    if (!layerNodes[node.layer]) layerNodes[node.layer] = [];
    layerNodes[node.layer].push(key);
  }

  const layers = Object.keys(layerNodes).map(Number).sort((a, b) => a - b);

  const nodeW = 138, nodeH = 54, padX = 80, padY = 24, layerGap = 80, nodeGap = 12;

  const layerY: Record<number, number> = {};
  let currentY = padY;
  for (const layer of layers) {
    layerY[layer] = currentY;
    currentY += nodeH + layerGap;
  }
  const svgH = currentY - layerGap + padY;

  const nodeX: Record<string, number> = {};
  const nodeY: Record<string, number> = {};

  const maxNodesPerLayer = Math.max(...layers.map(l => layerNodes[l]?.length ?? 0));
  const svgW = Math.max(600, maxNodesPerLayer * (nodeW + nodeGap) + padX * 2);

  for (const layer of layers) {
    const nodes = layerNodes[layer] ?? [];
    const totalW = nodes.length * (nodeW + nodeGap) - nodeGap;
    const startX = (svgW - totalW) / 2;
    nodes.forEach((key, i) => {
      nodeX[key] = startX + i * (nodeW + nodeGap);
      nodeY[key] = layerY[layer];
    });
  }

  return (
    <div ref={wrapRef} style={{ overflowX: 'auto' }}>
      <svg ref={svgRef} width={svgW} height={svgH} style={{ display: 'block', minWidth: '100%' }}>
        {layers.map(layer => {
          const nodes = layerNodes[layer] ?? [];
          if (!nodes.length) return null;
          const y = layerY[layer] - 10;
          const h = nodeH + 20;
          return (
            <g key={`layer-${layer}`}>
              <rect x={0} y={y} width={svgW} height={h} fill={LAYER_COLORS[layer] || '#f4f4f4'} opacity={0.35} />
              <text x={8} y={y + h / 2} dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#525252" fontFamily='"IBM Plex Sans", sans-serif'>
                {LAYER_LABELS[layer] || ''}
              </text>
            </g>
          );
        })}
        {Object.entries(nodeX).map(([key, x]) => {
          const y = nodeY[key];
          const status = statusMap[key];
          const isHealthy = status?.healthy ?? false;
          const isRunning = status?.running ?? false;
          const statusColor = isHealthy ? '#198038' : isRunning ? '#f1c21b' : '#da1e28';
          const meta = SERVICE_CATALOG[key];
          const nodeMeta = PIPELINE_LAYERS[key];
          const label = meta?.name ?? nodeMeta?.label ?? key;
          const svcMetrics = (metrics[key] || []).slice(0, 1);

          return (
            <g key={key} transform={`translate(${x}, ${y})`}>
              <rect width={nodeW} height={nodeH} rx={3} fill="#ffffff" stroke={isHealthy ? '#e0e0e0' : statusColor} strokeWidth={isHealthy ? 1 : 2} />
              <rect x={0} y={0} width={3} height={nodeH} rx={1.5} fill={statusColor} />
              <text x={12} y={22} fontSize="12" fontWeight="600" fill="#161616" fontFamily='"IBM Plex Sans", sans-serif'>
                {label.length > 16 ? label.substring(0, 15) + '…' : label}
              </text>
              {svcMetrics[0] && (
                <text x={12} y={38} fontSize="10" fill="#6f6f6f" fontFamily='"IBM Plex Sans", sans-serif'>
                  {svcMetrics[0].length > 22 ? svcMetrics[0].substring(0, 20) + '…' : svcMetrics[0]}
                </text>
              )}
              <circle cx={nodeW - 12} cy={14} r={4} fill={statusColor} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 그리드 뷰 (Carbon Tile 기반) ─────────────────────────────────────────

function GridView({ containers, metrics }: { containers: ContainerInfo[]; metrics: Record<string, string[]> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1px' }}>
      {containers.map(c => {
        const key = parseKey(c.name);
        const meta = SERVICE_CATALOG[key] ?? { name: key, desc: '', color: '#525252', Icon: Settings };
        const status = getStatus(c);
        const svcMetrics = (metrics[key] || []).slice(0, 2);
        const { Icon } = meta;

        return (
          <Tile key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '100px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {meta.name}
              </span>
              <span style={{ color: meta.color, flexShrink: 0, marginLeft: '4px' }}>
                <Icon size={16} />
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {meta.desc}
            </p>
            <div style={{ marginTop: 'auto' }}>
              <Tag type={getTagType(status.healthy, status.healthy || c.state === 'running')} size="sm">
                {status.text}
              </Tag>
            </div>
            {svcMetrics.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {svcMetrics.map((m, i) => (
                  <Tag key={i} type="gray" size="sm">{m}</Tag>
                ))}
              </div>
            )}
          </Tile>
        );
      })}
    </div>
  );
}

// ── 리스트 뷰 (Carbon DataTable) ─────────────────────────────────────────

const listHeaders = [
  { key: 'status', header: '' },
  { key: 'name',   header: '서비스' },
  { key: 'desc',   header: '설명' },
  { key: 'state',  header: '상태' },
  { key: 'metric', header: '메트릭' },
];

function ListView({ containers, metrics }: { containers: ContainerInfo[]; metrics: Record<string, string[]> }) {
  const rows = containers.map(c => {
    const key = parseKey(c.name);
    const meta = SERVICE_CATALOG[key] ?? { name: key, desc: '', color: '#525252', Icon: Settings };
    const status = getStatus(c);
    const svcMetrics = (metrics[key] || []).slice(0, 2);
    const isRunning = c.state === 'running';

    return {
      id: c.name,
      status: (
        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: status.color }} />
      ),
      name: <span style={{ fontWeight: 600, fontSize: '13px' }}>{meta.name}</span>,
      desc: <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{meta.desc}</span>,
      state: (
        <Tag type={getTagType(status.healthy, isRunning)} size="sm">
          {status.text}
        </Tag>
      ),
      metric: (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {svcMetrics.map((m, i) => (
            <Tag key={i} type="gray" size="sm">{m}</Tag>
          ))}
        </div>
      ),
    };
  });

  return (
    <DataTable rows={rows} headers={listHeaders}>
      {({ rows: tRows, headers: tHeaders, getHeaderProps, getRowProps, getTableProps }) => (
        <TableContainer>
          <Table {...getTableProps()} size="sm">
            <TableHead>
              <TableRow>
                {tHeaders.map(header => (
                  <TableHeader {...getHeaderProps({ header })} key={header.key}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {tRows.map(row => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map(cell => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = b;
  for (const u of units) {
    if (val < 1024) return `${val.toFixed(1)} ${u}`;
    val /= 1024;
  }
  return `${val.toFixed(1)} TB`;
}

export function ServiceStatusCard() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [metrics, setMetrics] = useState<Record<string, string[]>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [containerRes, dbRes, rustfsRes, alertSummaryRes] = await Promise.all([
          dashboardApi.containers().catch(() => ({ success: false, containers: [] })),
          dashboardApi.databaseStatus().catch(() => ({})),
          dashboardApi.rustFSStats().catch(() => ({})),
          dashboardApi.alertSummary(),
        ]);

        if (!mounted) return;
        if (!containerRes.success) { setError(true); return; }

        const ctrs = (containerRes.containers || []).sort((a, b) => a.name.localeCompare(b.name));

        const pg = (dbRes as any).postgresql || {};
        const rd = (dbRes as any).redis || {};
        const es = (dbRes as any).elasticsearch || {};
        const rf = rustfsRes as any;
        const st = (dbRes as any).stalwart || {};

        const m: Record<string, string[]> = {
          api:              [`${ctrs.length} containers`],
          db:               [pg.version || '—', `Size: ${pg.size || '—'}`, `Conn: ${pg.connections ?? '—'}`],
          dc:               [`Realm: ${window.location.hostname}`],
          es:               [es.version ? `v${es.version}` : '—', `Docs: ${(es.docs_count ?? 0).toLocaleString()}`],
          'es-exporter':    [es.status === 'up' ? 'Collecting' : 'Waiting'],
          elasticvue:       [es.indices_count ? `${es.indices_count} indices` : '—'],
          grafana:          ['PG · Redis · ES'],
          keycloak:         ['Realm: polyon', 'PKCE S256'],
          mail:             [st.version && st.version !== '—' ? `v${st.version}` : '—', 'SMTP · IMAP'],
          'pg-exporter':    [pg.status === 'up' ? 'Collecting' : 'Waiting'],
          pgadmin:          [pg.databases ? pg.databases.join(', ') : '—'],
          prometheus:       [`Alerts: ${alertSummaryRes.total ?? 0}`],
          redis:            [rd.version ? `v${rd.version}` : '—', `Keys: ${rd.total_keys ?? '—'}`],
          'redis-exporter': [rd.status === 'up' ? 'Collecting' : 'Waiting'],
          redisinsight:     [rd.total_keys ? `${rd.total_keys} keys` : '—'],
          rustfs:           [rf.total_buckets ? `${rf.total_buckets} buckets` : '—', (rf as any).total_size_bytes ? formatBytes((rf as any).total_size_bytes) : '—'],
          ui:               ['nginx · SPA'],
          traefik:          ['Ports: 1111-1119', 'TLS auto'],
        };

        try {
          const snRes = await dashboardApi.sentinelStatus().catch(() => ({}));
          m['sentinel'] = [((snRes as any).state === 'running') ? 'Agent active' : 'Agent idle'];
        } catch {
          m['sentinel'] = ['—'];
        }

        if (mounted) { setContainers(ctrs); setMetrics(m); }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const cardHeader = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={16} />
        <h4 className="cds--productive-heading-02">Service Status</h4>
        {!loading && !error && (
          <Tag type="gray" size="sm">{containers.length} 서비스</Tag>
        )}
      </div>
      <div style={{ display: 'flex', gap: '2px' }}>
        <IconButton
          label="그리드 뷰"
          kind={viewMode === 'grid' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <Application size={16} />
        </IconButton>
        <IconButton
          label="리스트 뷰"
          kind={viewMode === 'list' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <Catalog size={16} />
        </IconButton>
        <IconButton
          label="파이프라인 뷰"
          kind={viewMode === 'pipeline' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('pipeline')}
        >
          <Activity size={16} />
        </IconButton>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Tile>
        {cardHeader}
        <SkeletonText paragraph lineCount={4} />
      </Tile>
    );
  }

  if (error) {
    return (
      <Tile>
        {cardHeader}
        <InlineNotification
          kind="warning"
          title="연결 실패"
          subtitle="컨테이너 상태 API에 연결할 수 없습니다."
          lowContrast
          hideCloseButton
        />
      </Tile>
    );
  }

  return (
    <Tile style={viewMode !== 'grid' ? undefined : { padding: 0 }}>
      {viewMode === 'grid' ? (
        <>
          <div style={{ padding: '16px 16px 8px' }}>{cardHeader}</div>
          <GridView containers={containers} metrics={metrics} />
        </>
      ) : viewMode === 'list' ? (
        <>
          {cardHeader}
          <ListView containers={containers} metrics={metrics} />
        </>
      ) : (
        <>
          {cardHeader}
          <div style={{ width: '100%', overflow: 'hidden', background: 'var(--cds-layer-02)', padding: '8px' }}>
            <PipelineView containers={containers} metrics={metrics} />
          </div>
        </>
      )}
    </Tile>
  );
}
