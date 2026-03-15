import { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Tab, TabList, TabPanels, TabPanel,
  DataTable, TableContainer, Table, TableHead, TableRow,
  TableHeader, TableBody, TableCell,
  Tag, Loading, InlineNotification, Tile,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { apiFetch } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Overview {
  http: { routers: { total: number }; services: { total: number }; middlewares: { total: number } };
  tcp: { routers: { total: number }; services: { total: number } };
  features?: { metrics?: string };
}
interface Router {
  name: string; rule?: string; status?: string; service?: string;
  entryPoints?: string[]; middlewares?: string[]; tls?: object;
}
interface Service {
  name: string; status?: string; type?: string;
  loadBalancer?: { servers?: { url: string; status?: string }[] };
}
interface EntryPoint {
  name: string; address?: string; http?: object;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusTag({ status }: { status?: string }) {
  if (status === 'enabled') return <Tag type="green" size="sm">활성</Tag>;
  if (status === 'disabled') return <Tag type="gray" size="sm">비활성</Tag>;
  if (status === 'warning') return <Tag type="warm-gray" size="sm">경고</Tag>;
  return <Tag type="gray" size="sm">{status ?? '—'}</Tag>;
}

function shortName(name: string) {
  // polyon-polyon-console-ingress-console-cmars-com@kubernetes → console.cmars.com
  const match = name.match(/([a-z0-9-]+\.[a-z0-9-]+\.[a-z]+)@/);
  if (match) return match[1];
  return name.replace(/@.*$/, '');
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TraefikPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [routers, setRouters] = useState<Router[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [entrypoints, setEntrypoints] = useState<EntryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ov, rt, sv, ep] = await Promise.all([
        apiFetch<{ overview: Overview }>('/traefik/overview'),
        apiFetch<{ routers: Router[] }>('/traefik/routers?protocol=http'),
        apiFetch<{ services: Service[] }>('/traefik/services?protocol=http'),
        apiFetch<{ entrypoints: EntryPoint[] }>('/traefik/entrypoints'),
      ]);
      setOverview(ov.overview);
      setRouters(rt.routers ?? []);
      setServices(sv.services ?? []);
      setEntrypoints(ep.entrypoints ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
      <PageHeader
        title="Traefik 라우팅 관리"
        description="PP 제5원칙 — 단일 관문. 등록된 라우트, 서비스, 엔트리포인트 현황"
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

      {!loading && overview && (
        <div style={{ padding: '0 16px' }}>
          {/* ── 요약 카드 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '16px 0' }}>
            {[
              { label: 'HTTP 라우터', value: overview.http?.routers?.total ?? 0 },
              { label: 'HTTP 서비스', value: overview.http?.services?.total ?? 0 },
              { label: 'TCP 라우터', value: overview.tcp?.routers?.total ?? 0 },
              { label: '엔트리포인트', value: entrypoints.length },
            ].map(({ label, value }) => (
              <Tile key={label} style={{ padding: '16px', background: '#262626' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#8d8d8d' }}>{label}</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.75rem', fontWeight: 700 }}>{value}</p>
              </Tile>
            ))}
          </div>

          {/* ── 탭 ── */}
          <Tabs>
            <TabList aria-label="Traefik 탭">
              <Tab>HTTP 라우터</Tab>
              <Tab>서비스</Tab>
              <Tab>엔트리포인트</Tab>
            </TabList>
            <TabPanels>

              {/* ── HTTP Routers ── */}
              <TabPanel>
                <div style={{ paddingTop: '12px' }}>
                  <DataTable
                    rows={routers.map((r, i) => ({
                      id: String(i),
                      name: shortName(r.name),
                      rule: r.rule ?? '—',
                      service: r.service?.replace(/@.*$/, '') ?? '—',
                      entrypoints: (r.entryPoints ?? []).join(', ') || '—',
                      status: r.status,
                      tls: r.tls ? 'TLS' : '—',
                    }))}
                    headers={[
                      { key: 'name', header: '도메인/라우터' },
                      { key: 'rule', header: '규칙' },
                      { key: 'service', header: '서비스' },
                      { key: 'entrypoints', header: '엔트리포인트' },
                      { key: 'tls', header: 'TLS' },
                      { key: 'status', header: '상태' },
                    ]}
                  >
                    {({ rows, headers, getHeaderProps, getTableProps }) => (
                      <TableContainer>
                        <Table {...getTableProps()} size="sm">
                          <TableHead>
                            <TableRow>
                              {headers.map(h => (
                                <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.map(row => (
                              <TableRow key={row.id}>
                                {row.cells.map(cell => (
                                  <TableCell key={cell.id}>
                                    {cell.info.header === 'status' ? (
                                      <StatusTag status={String(cell.value)} />
                                    ) : cell.info.header === 'tls' && cell.value === 'TLS' ? (
                                      <Tag type="blue" size="sm">TLS</Tag>
                                    ) : (
                                      <span style={{ fontSize: '0.8rem', fontFamily: cell.info.header === 'rule' ? 'IBM Plex Mono, monospace' : undefined }}>
                                        {cell.value || '—'}
                                      </span>
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </DataTable>
                </div>
              </TabPanel>

              {/* ── Services ── */}
              <TabPanel>
                <div style={{ paddingTop: '12px' }}>
                  <DataTable
                    rows={services.map((s, i) => {
                      const servers = s.loadBalancer?.servers ?? [];
                      const healthy = servers.filter(sv => sv.status === 'UP' || !sv.status).length;
                      return {
                        id: String(i),
                        name: s.name.replace(/@.*$/, ''),
                        status: s.status,
                        servers: servers.length,
                        healthy: `${healthy}/${servers.length}`,
                        url: servers[0]?.url ?? '—',
                      };
                    })}
                    headers={[
                      { key: 'name', header: '서비스명' },
                      { key: 'status', header: '상태' },
                      { key: 'servers', header: '서버 수' },
                      { key: 'url', header: '백엔드 URL' },
                    ]}
                  >
                    {({ rows, headers, getHeaderProps, getTableProps }) => (
                      <TableContainer>
                        <Table {...getTableProps()} size="sm">
                          <TableHead>
                            <TableRow>
                              {headers.map(h => (
                                <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.map(row => (
                              <TableRow key={row.id}>
                                {row.cells.map(cell => (
                                  <TableCell key={cell.id}>
                                    {cell.info.header === 'status' ? (
                                      <StatusTag status={String(cell.value)} />
                                    ) : cell.info.header === 'url' ? (
                                      <code style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>{cell.value}</code>
                                    ) : (
                                      String(cell.value)
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </DataTable>
                </div>
              </TabPanel>

              {/* ── EntryPoints ── */}
              <TabPanel>
                <div style={{ paddingTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {entrypoints.map(ep => (
                    <Tile key={ep.name} style={{ padding: '16px', background: '#262626' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Tag type="blue" size="sm">{ep.name}</Tag>
                        {ep.http && <Tag type="teal" size="sm">HTTP</Tag>}
                      </div>
                      <p style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem' }}>
                        {ep.address ?? '—'}
                      </p>
                    </Tile>
                  ))}
                </div>
              </TabPanel>

            </TabPanels>
          </Tabs>

          {/* ── 새로고침 ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
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
