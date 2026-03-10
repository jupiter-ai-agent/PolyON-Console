import { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineLoading,
  Tile,
  Dropdown,
} from '@carbon/react';
import {
  Renew,
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
  DataBase,
  Activity,
  Document,
  CloudServiceManagement,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { prcApi, type ProviderInfo, type ClaimInfo, type SagaLogEntry } from '../../api/prc';

// ── 헬퍼 ──

function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { type: 'green' | 'red' | 'blue' | 'gray' | 'cyan' | 'magenta'; label: string }> = {
    healthy: { type: 'green', label: 'Healthy' },
    bound: { type: 'green', label: 'Bound' },
    provisioned: { type: 'green', label: 'Provisioned' },
    pending: { type: 'cyan', label: 'Pending' },
    provisioning: { type: 'blue', label: 'Provisioning' },
    failed: { type: 'red', label: 'Failed' },
    removing: { type: 'magenta', label: 'Removing' },
    removed: { type: 'gray', label: 'Removed' },
    success: { type: 'green', label: 'Success' },
    compensated: { type: 'magenta', label: 'Compensated' },
    degraded: { type: 'magenta', label: 'Degraded' },
    error: { type: 'red', label: 'Error' },
  };
  const m = map[status] ?? { type: 'gray' as const, label: status };
  return <Tag type={m.type} size="sm">{m.label}</Tag>;
}

// ── StatCard ──

function StatCard({ label, value, icon, loading }: { label: string; value: string | number | React.ReactNode; icon?: React.ReactNode; loading?: boolean }) {
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

// ── Provider 아이콘 맵 ──

const PROVIDER_ICONS: Record<string, string> = {
  database: '🗄️',
  cache: '⚡',
  search: '🔍',
  objectStorage: '📦',
  directory: '👥',
  smtp: '✉️',
  git: '🔀',
  ai: '🤖',
  auth: '🔐',
};

// ── Overview 탭 ──

function OverviewTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [claims, setClaims] = useState<ClaimInfo[]>([]);
  const [sagaLog, setSagaLog] = useState<SagaLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        prcApi.listProviders(),
        prcApi.listClaims(),
        prcApi.listSagaLog({ limit: 5 }),
      ]);
      setProviders(p);
      setClaims(c.items ?? []);
      setSagaLog(s.items ?? []);
    } catch (e) {
      console.error('PRC overview load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalClaims = claims.length;
  const boundClaims = claims.filter(c => c.status === 'bound' || c.status === 'provisioned').length;
  const failedClaims = claims.filter(c => c.status === 'failed').length;
  const activeProviders = providers.filter(p => p.claimCount > 0).length;

  return (
    <div>
      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Providers" value={activeProviders} icon={<CloudServiceManagement size={16} />} loading={loading} />
        <StatCard label="Total Claims" value={totalClaims} icon={<Document size={16} />} loading={loading} />
        <StatCard label="Bound" value={boundClaims} icon={<CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} />} loading={loading} />
        <StatCard label="Failed" value={failedClaims} icon={<ErrorFilled size={16} style={{ color: failedClaims > 0 ? 'var(--cds-support-error)' : 'var(--cds-text-secondary)' }} />} loading={loading} />
      </div>

      {/* Provider Status Grid */}
      <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Foundation Providers</h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {providers.map(p => (
          <Tile key={p.type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: 24 }}>{PROVIDER_ICONS[p.type] ?? '📋'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.service}</div>
              <div style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>{p.type}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusTag status={p.status} />
              <div style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                {p.claimCount} claim{p.claimCount !== 1 ? 's' : ''}
              </div>
            </div>
          </Tile>
        ))}
      </div>

      {/* Recent Saga Log */}
      <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Recent Activity</h5>
      {sagaLog.length === 0 ? (
        <Tile style={{ padding: 24, textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
          프로비저닝 이력이 없습니다
        </Tile>
      ) : (
        <DataTable
          rows={sagaLog.map((s, i) => ({
            id: s.id || String(i),
            time: fmtDate(s.createdAt),
            module: s.moduleId,
            action: s.action,
            type: s.claimType,
            status: s.status,
            duration: s.durationMs != null ? `${s.durationMs}ms` : '—',
          }))}
          headers={[
            { key: 'time', header: '시간' },
            { key: 'module', header: '모듈' },
            { key: 'action', header: 'Action' },
            { key: 'type', header: 'Type' },
            { key: 'status', header: '상태' },
            { key: 'duration', header: '소요' },
          ]}
          size="sm"
        >
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map(cell => (
                      <TableCell key={cell.id}>
                        {cell.info.header === 'status' ? <StatusTag status={cell.value} /> : cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}
    </div>
  );
}

// ── Providers 탭 ──

function ProvidersTab() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prcApi.listProviders().then(p => { setProviders(p); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <InlineLoading description="Loading providers..." />;

  const headers = [
    { key: 'type', header: 'Provider' },
    { key: 'service', header: 'Service' },
    { key: 'status', header: 'Status' },
    { key: 'claimCount', header: 'Claims' },
    { key: 'boundCount', header: 'Bound' },
  ];

  const rows = providers.map(p => ({
    id: p.type,
    type: p.type,
    service: p.service,
    status: p.status,
    claimCount: p.claimCount,
    boundCount: p.boundCount,
  }));

  return (
    <DataTable rows={rows} headers={headers} size="md">
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow {...getRowProps({ row })} key={row.id}>
                {row.cells.map(cell => (
                  <TableCell key={cell.id}>
                    {cell.info.header === 'status' ? <StatusTag status={cell.value} /> :
                     cell.info.header === 'type' ? (
                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                         <span>{PROVIDER_ICONS[cell.value] ?? '📋'}</span>
                         <span style={{ fontWeight: 500 }}>{cell.value}</span>
                       </span>
                     ) : cell.value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
}

// ── Claims 탭 ──

function ClaimsTab() {
  const [claims, setClaims] = useState<ClaimInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await prcApi.listClaims(params);
      setClaims(res.items ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterType, filterStatus]);

  const typeItems = [
    { id: '', label: '전체' },
    { id: 'database', label: 'database' },
    { id: 'cache', label: 'cache' },
    { id: 'search', label: 'search' },
    { id: 'objectStorage', label: 'objectStorage' },
    { id: 'directory', label: 'directory' },
    { id: 'smtp', label: 'smtp' },
    { id: 'git', label: 'git' },
    { id: 'ai', label: 'ai' },
    { id: 'auth', label: 'auth' },
  ];

  const statusItems = [
    { id: '', label: '전체' },
    { id: 'bound', label: 'Bound' },
    { id: 'provisioned', label: 'Provisioned' },
    { id: 'pending', label: 'Pending' },
    { id: 'failed', label: 'Failed' },
  ];

  const headers = [
    { key: 'moduleName', header: '모듈' },
    { key: 'claimType', header: 'Type' },
    { key: 'status', header: '상태' },
    { key: 'config', header: 'Config' },
    { key: 'createdAt', header: '생성일' },
  ];

  const rows = claims.map((c, i) => ({
    id: c.id || String(i),
    moduleName: c.moduleName || c.moduleId,
    claimType: c.claimType,
    status: c.status,
    config: typeof c.config === 'object' ? JSON.stringify(c.config) : String(c.config),
    createdAt: fmtDate(c.createdAt),
  }));

  return (
    <div>
      {/* 필터 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Dropdown
          id="filter-type"
          titleText="Provider"
          label="전체"
          items={typeItems}
          itemToString={(item: { label: string } | null) => item?.label ?? ''}
          onChange={(e: any) => setFilterType(e.selectedItem?.id ?? '')}
          size="sm"
          style={{ width: 180 }}
        />
        <Dropdown
          id="filter-status"
          titleText="Status"
          label="전체"
          items={statusItems}
          itemToString={(item: { label: string } | null) => item?.label ?? ''}
          onChange={(e: any) => setFilterStatus(e.selectedItem?.id ?? '')}
          size="sm"
          style={{ width: 160 }}
        />
      </div>

      {loading ? (
        <InlineLoading description="Loading claims..." />
      ) : claims.length === 0 ? (
        <Tile style={{ padding: 24, textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
          {filterType || filterStatus ? '필터 조건에 맞는 Claim이 없습니다' : '등록된 Claim이 없습니다'}
        </Tile>
      ) : (
        <DataTable rows={rows} headers={headers} size="md">
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map(cell => (
                      <TableCell key={cell.id}>
                        {cell.info.header === 'status' ? <StatusTag status={cell.value} /> :
                         cell.info.header === 'claimType' ? (
                           <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                             <span>{PROVIDER_ICONS[cell.value] ?? '📋'}</span>
                             {cell.value}
                           </span>
                         ) :
                         cell.info.header === 'config' ? (
                           <code style={{ fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                             {cell.value}
                           </code>
                         ) : cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}
    </div>
  );
}

// ── Saga Log 탭 ──

function SagaLogTab() {
  const [log, setLog] = useState<SagaLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prcApi.listSagaLog({ limit: 100 }).then(r => { setLog(r.items ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <InlineLoading description="Loading saga log..." />;

  const headers = [
    { key: 'time', header: '시간' },
    { key: 'module', header: '모듈' },
    { key: 'action', header: 'Action' },
    { key: 'type', header: 'Type' },
    { key: 'status', header: '상태' },
    { key: 'duration', header: '소요' },
    { key: 'error', header: '에러' },
  ];

  const rows = log.map((s, i) => ({
    id: s.id || String(i),
    time: fmtDate(s.createdAt),
    module: s.moduleId,
    action: s.action,
    type: s.claimType,
    status: s.status,
    duration: s.durationMs != null ? `${s.durationMs}ms` : '—',
    error: s.error ?? '—',
  }));

  return log.length === 0 ? (
    <Tile style={{ padding: 24, textAlign: 'center', color: 'var(--cds-text-secondary)' }}>
      프로비저닝 이력이 없습니다
    </Tile>
  ) : (
    <DataTable rows={rows} headers={headers} size="sm">
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow {...getRowProps({ row })} key={row.id}>
                {row.cells.map(cell => (
                  <TableCell key={cell.id}>
                    {cell.info.header === 'status' ? <StatusTag status={cell.value} /> :
                     cell.info.header === 'type' ? (
                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                         <span>{PROVIDER_ICONS[cell.value] ?? '📋'}</span>
                         {cell.value}
                       </span>
                     ) : cell.value}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
}

// ── 메인 PRC 페이지 ──

export default function PRCPage() {
  return (
    <>
      <PageHeader
        title="Platform Resources"
        description="Foundation Provider 상태, Module Claim, 프로비저닝 이력을 모니터링합니다."
        actions={[]}
      />
      <Tabs>
        <TabList aria-label="PRC tabs" contained>
          <Tab>개요</Tab>
          <Tab>Providers</Tab>
          <Tab>Claims</Tab>
          <Tab>Saga Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel style={{ padding: '16px 0' }}><OverviewTab /></TabPanel>
          <TabPanel style={{ padding: '16px 0' }}><ProvidersTab /></TabPanel>
          <TabPanel style={{ padding: '16px 0' }}><ClaimsTab /></TabPanel>
          <TabPanel style={{ padding: '16px 0' }}><SagaLogTab /></TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}
