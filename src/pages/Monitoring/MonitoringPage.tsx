// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Select, SelectItem, Tag, SkeletonText,
} from '@carbon/react';
import { Activity, Renew, View, ChevronDown } from '@carbon/icons-react';

const GRAFANA_BASE = '/grafana';

const timeOptions = [
  { value: 'now-15m', label: '15분' },
  { value: 'now-1h',  label: '1시간' },
  { value: 'now-3h',  label: '3시간' },
  { value: 'now-6h',  label: '6시간' },
  { value: 'now-12h', label: '12시간' },
  { value: 'now-24h', label: '24시간' },
  { value: 'now-2d',  label: '2일' },
  { value: 'now-7d',  label: '7일' },
];

const services = {
  overview: {
    label: 'Overview',
    uid: 'polyon-overview', slug: 'polyon-infrastructure-overview',
    panels: [
      { id: 1, title: 'PG Connections', w: 1 },
      { id: 2, title: 'PG DB Size', w: 1 },
      { id: 3, title: 'Redis Memory', w: 1 },
      { id: 4, title: 'Redis Clients', w: 1 },
      { id: 5, title: 'Redis Hit Rate', w: 1 },
      { id: 6, title: 'ES Health', w: 1 },
    ],
  },
  postgresql: {
    label: 'PostgreSQL',
    uid: 'polyon-postgresql', slug: 'polyon-postgresql',
    panels: [
      { id: 1, title: 'Active Connections', w: 1 },
      { id: 2, title: 'Database Size', w: 1 },
      { id: 3, title: 'Uptime', w: 1 },
      { id: 4, title: 'Cache Hit Ratio', w: 1 },
      { id: 5, title: 'Transactions', w: 1 },
      { id: 6, title: 'Deadlocks', w: 1 },
      { id: 10, title: 'Transactions / sec', w: 2 },
      { id: 11, title: 'Rows Read / Written', w: 2 },
      { id: 12, title: 'Cache: Hit vs Read', w: 2 },
      { id: 13, title: 'Connections by State', w: 2 },
    ],
  },
  redis: {
    label: 'Redis',
    uid: 'polyon-redis', slug: 'polyon-redis',
    panels: [
      { id: 1, title: 'Memory Used', w: 1 },
      { id: 2, title: 'Memory Max', w: 1 },
      { id: 3, title: 'Connected Clients', w: 1 },
      { id: 4, title: 'Hit Rate', w: 1 },
      { id: 5, title: 'Total Keys', w: 1 },
      { id: 6, title: 'Uptime', w: 1 },
      { id: 10, title: 'Memory Usage', w: 2 },
      { id: 11, title: 'Commands / sec', w: 2 },
      { id: 12, title: 'Hit / Miss Rate', w: 2 },
      { id: 13, title: 'Network I/O', w: 2 },
    ],
  },
  elasticsearch: {
    label: 'Elasticsearch',
    uid: 'polyon-elasticsearch', slug: 'polyon-elasticsearch',
    panels: [
      { id: 1, title: 'Cluster Health', w: 1 },
      { id: 2, title: 'Active Shards', w: 1 },
      { id: 3, title: 'Total Docs', w: 1 },
      { id: 4, title: 'Store Size', w: 1 },
      { id: 5, title: 'JVM Heap %', w: 1 },
      { id: 6, title: 'Unassigned Shards', w: 1 },
      { id: 10, title: 'Indexing Rate', w: 2 },
      { id: 11, title: 'Search Rate', w: 2 },
      { id: 12, title: 'JVM Heap Memory', w: 2 },
      { id: 13, title: 'GC Time', w: 2 },
    ],
  },
};

function panelUrl(uid, slug, panelId, timeRange) {
  return `${GRAFANA_BASE}/d-solo/${uid}/${slug}?orgId=1&panelId=${panelId}&from=${timeRange}&to=now&theme=light&kiosk`;
}

function StatusTag({ status }) {
  const s = (status || '').toLowerCase();
  if (s === 'up' || s === 'green') return <Tag type="green">Running</Tag>;
  if (s === 'yellow') return <Tag type="teal">Degraded</Tag>;
  return <Tag type="red">Down</Tag>;
}

function DbStatusBar({ dbStatus, service }) {
  if (!dbStatus) return null;
  const pg = dbStatus.postgresql || {};
  const rd = dbStatus.redis || {};
  const es = dbStatus.elasticsearch || {};
  const rf = dbStatus.rustfs || {};
  const st = dbStatus.stalwart || {};

  if (service === 'overview') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', padding: '12px 16px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', marginBottom: '16px', fontSize: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>PostgreSQL 18</strong> <StatusTag status={pg.status} />
          <span style={{ color: 'var(--cds-text-secondary)' }}>{pg.version}</span>
          <span style={{ color: 'var(--cds-text-secondary)' }}>Size: {pg.size || 'N/A'}</span>
          <span style={{ color: 'var(--cds-text-secondary)' }}>Conn: {pg.connections ?? '-'}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>Redis {rd.version}</strong> <StatusTag status={rd.status} />
          <span style={{ color: 'var(--cds-text-secondary)' }}>Mem: {rd.memory_used || 'N/A'}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>Elasticsearch {es.version}</strong> <StatusTag status={es.cluster_status || es.status} />
          <span style={{ color: 'var(--cds-text-secondary)' }}>Docs: {(es.docs_count ?? 0).toLocaleString()}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong>Stalwart Mail v{st.version || '—'}</strong> <StatusTag status={st.status} />
        </span>
      </div>
    );
  }

  const infoMap = {
    postgresql: [
      { label: 'PostgreSQL 18', extra: `${pg.version || ''} · Uptime: ${pg.uptime || 'N/A'} · Size: ${pg.size || 'N/A'} · Conn: ${pg.connections ?? '-'}`, status: pg.status },
    ],
    redis: [
      { label: `Redis ${rd.version || ''}`, extra: `Uptime: ${rd.uptime_human || 'N/A'} · Mem: ${rd.memory_used || 'N/A'} · Keys: ${rd.total_keys ?? '-'}`, status: rd.status },
    ],
    elasticsearch: [
      { label: `Elasticsearch ${es.version || ''}`, extra: `Cluster: ${es.cluster_name || '—'} · Nodes: ${es.nodes ?? '-'} · Docs: ${(es.docs_count ?? 0).toLocaleString()}`, status: es.cluster_status || es.status },
    ],
  };

  const items = infoMap[service] || [];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', marginBottom: '16px', fontSize: '12px' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <strong>{item.label}</strong>
          <StatusTag status={item.status} />
          <span style={{ color: 'var(--cds-text-secondary)' }}>{item.extra}</span>
        </span>
      ))}
    </div>
  );
}

function OverviewMetricCard({ title, value, loading }) {
  return (
    <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '16px', minHeight: '100px' }}>
      <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>{title}</div>
      {loading ? (
        <SkeletonText paragraph />
      ) : (
        <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--cds-text-primary)', lineHeight: 1 }}>{value || '—'}</div>
      )}
    </div>
  );
}

function GrafanaPanel({ uid, slug, panelId, title, timeRange, wide }) {
  const viewUrl = `${GRAFANA_BASE}/d/${uid}/${slug}?orgId=1&viewPanel=${panelId}&from=${timeRange}&to=now&theme=light`;
  return (
    <div style={{
      background: 'var(--cds-layer-01)',
      border: '1px solid var(--cds-border-subtle-00)',
      overflow: 'hidden',
      gridColumn: wide ? 'span 2' : 'span 1',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--cds-border-subtle-00)', fontSize: '12px', fontWeight: 600 }}>
        <span>{title}</span>
        <a href={viewUrl} target="_blank" rel="noopener" style={{ color: 'var(--cds-icon-secondary)', display: 'flex' }}>
          <View size={16} />
        </a>
      </div>
      <div style={{ position: 'relative', height: '180px' }}>
        <iframe
          src={panelUrl(uid, slug, panelId, timeRange)}
          loading="lazy"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={title}
        />
      </div>
    </div>
  );
}

function OverviewContent({ timeRange, dbStatus }) {
  const [metrics, setMetrics] = useState({ pgConn: null, pgSize: null, rdMem: null, rdCli: null, rdHit: null, esHealth: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const promQuery = async (q) => {
          const res = await fetch(`/api/v1/system/prometheus/query?query=${encodeURIComponent(q)}`);
          const json = await res.json();
          if (json.status === 'success' && json.data?.result?.length > 0) {
            return parseFloat(json.data.result[0].value[1]);
          }
          return null;
        };
        const [pgConn, pgSize, rdMem, rdCli, rdHit] = await Promise.all([
          promQuery('sum(pg_stat_activity_count{datname!=""})'),
          promQuery('sum(pg_database_size_bytes)'),
          promQuery('redis_memory_used_bytes'),
          promQuery('redis_connected_clients'),
          promQuery('redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) * 100'),
        ]);
        const esStatus = (dbStatus?.elasticsearch?.cluster_status || dbStatus?.elasticsearch?.status || '').toUpperCase();
        setMetrics({ pgConn, pgSize, rdMem, rdCli, rdHit, esHealth: esStatus });
      } catch {}
      setLoading(false);
    };
    load();
  }, [timeRange]);

  const fmtBytes = (b) => {
    if (b === null || b === undefined) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0, v = b;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return v.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  };

  const esColor = { GREEN: 'var(--cds-support-success)', YELLOW: 'var(--cds-support-warning)', RED: 'var(--cds-support-error)' }[metrics.esHealth] || 'var(--cds-text-secondary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '12px' }}>Key Metrics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
          <OverviewMetricCard title="PG Connections" value={metrics.pgConn !== null ? Math.round(metrics.pgConn) : null} loading={loading} />
          <OverviewMetricCard title="PG DB Size" value={fmtBytes(metrics.pgSize)} loading={loading} />
          <OverviewMetricCard title="Redis Memory" value={fmtBytes(metrics.rdMem)} loading={loading} />
          <OverviewMetricCard title="Redis Clients" value={metrics.rdCli !== null ? Math.round(metrics.rdCli) : null} loading={loading} />
          <OverviewMetricCard title="Redis Hit Rate" value={metrics.rdHit !== null ? metrics.rdHit.toFixed(1) + '%' : null} loading={loading} />
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '16px', minHeight: '100px' }}>
            <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>ES Health</div>
            {loading ? <SkeletonText paragraph /> : (
              <div style={{ fontSize: '22px', fontWeight: 600, color: esColor }}>{metrics.esHealth || '—'}</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '12px' }}>Throughput</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <GrafanaPanel uid="polyon-overview" slug="polyon-infrastructure-overview" panelId={11} title="PostgreSQL TPS" timeRange={timeRange} wide={false} />
          <GrafanaPanel uid="polyon-overview" slug="polyon-infrastructure-overview" panelId={12} title="Redis Commands/s" timeRange={timeRange} wide={false} />
        </div>
      </div>
    </div>
  );
}

function ServiceContent({ service, timeRange, dbStatus }) {
  const svc = services[service];
  if (!svc) return null;

  const smallPanels = svc.panels.filter(p => p.w === 1);
  const widePanels = svc.panels.filter(p => p.w === 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <DbStatusBar dbStatus={dbStatus} service={service} />

      {smallPanels.length > 0 && (
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '12px' }}>Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
            {smallPanels.map(p => (
              <GrafanaPanel key={p.id} uid={svc.uid} slug={svc.slug} panelId={p.id} title={p.title} timeRange={timeRange} wide={false} />
            ))}
          </div>
        </div>
      )}

      {widePanels.length > 0 && (
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '12px' }}>Performance</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {widePanels.map(p => (
              <GrafanaPanel key={p.id} uid={svc.uid} slug={svc.slug} panelId={p.id} title={p.title} timeRange={timeRange} wide={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonitoringPage() {
  const [timeRange, setTimeRange] = useState('now-1h');
  const [activeService, setActiveService] = useState('overview');
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    fetch('/api/v1/databases/status')
      .then(r => r.json())
      .then(data => setDbStatus(data))
      .catch(() => setDbStatus(null));
  }, []);

  const serviceKeys = Object.keys(services);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--cds-text-primary)', margin: 0 }}>Monitoring</h1>
            <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>Grafana 기반 시스템 모니터링</p>
          </div>
          <Select
            id="time-range"
            labelText=""
           
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            style={{ width: '140px' }}
          >
            {timeOptions.map(t => (
              <SelectItem key={t.value} value={t.value} text={t.label} />
            ))}
          </Select>
        </div>

        </div>

      {/* Service Tabs + Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Tabs
          selectedIndex={serviceKeys.indexOf(activeService)}
          onChange={({ selectedIndex }) => setActiveService(serviceKeys[selectedIndex])}
        >
          <TabList contained aria-label="서비스 탭">
            {serviceKeys.map(key => (
              <Tab key={key}>{services[key].label}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {serviceKeys.map(key => (
              <TabPanel key={key} style={{ padding: '24px 32px' }}>
                {key === 'overview' ? (
                  <OverviewContent timeRange={timeRange} dbStatus={dbStatus} />
                ) : (
                  <ServiceContent service={key} timeRange={timeRange} dbStatus={dbStatus} />
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
