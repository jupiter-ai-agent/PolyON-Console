import { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import { aiApi }      from '../../api/ai';
import type { UsageLog } from '../../api/ai';

export default function AIUsagePage() {
  const [logs,        setLogs]        = useState<UsageLog[]>([]);
  const [totalSpend,  setTotalSpend]  = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const global = await aiApi.getUsageGlobal();
        setTotalSpend(global?.spend || global?.total_spend || 0);
      } catch {}
      try {
        const raw = await aiApi.getUsageLogs();
        const list = Array.isArray(raw) ? raw : (raw as { logs: UsageLog[] }).logs || [];
        setLogs(list);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const totalReqs      = logs.length;
  const totalTokensIn  = logs.reduce((s, l) => s + (l.prompt_tokens || 0), 0);
  const totalTokensOut = logs.reduce((s, l) => s + (l.completion_tokens || 0), 0);

  // By model breakdown
  const byModel: Record<string, { count: number; spend: number; tokens: number }> = {};
  logs.forEach(l => {
    const m = l.model || 'unknown';
    if (!byModel[m]) byModel[m] = { count: 0, spend: 0, tokens: 0 };
    byModel[m].count++;
    byModel[m].spend  += l.spend || 0;
    byModel[m].tokens += (l.prompt_tokens || 0) + (l.completion_tokens || 0);
  });
  const modelKeys = Object.keys(byModel).sort((a, b) => byModel[b].spend - byModel[a].spend);

  const StatCard = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>{sub}</div>
    </div>
  );

  const CardSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{title}</h4>
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  );

  // Model breakdown DataTable
  const modelHeaders = [
    { key: 'model',    header: 'Model' },
    { key: 'requests', header: 'Requests' },
    { key: 'cost',     header: 'Cost' },
    { key: 'tokens',   header: 'Tokens' },
  ];
  const modelRows = modelKeys.map((m, i) => ({
    id:       String(i),
    model:    m,
    requests: String(byModel[m].count),
    cost:     '$' + byModel[m].spend.toFixed(4),
    tokens:   byModel[m].tokens.toLocaleString(),
  }));

  // Recent logs DataTable
  const logHeaders = [
    { key: 'time',   header: 'Time' },
    { key: 'model',  header: 'Model' },
    { key: 'key',    header: 'Key' },
    { key: 'tokens', header: 'Tokens' },
    { key: 'cost',   header: 'Cost' },
  ];
  const logRows = logs.slice(0, 50).map((l, i) => {
    const time     = l.startTime ? new Date(l.startTime).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
    const keyShort = l.api_key ? '...' + l.api_key.slice(-6) : '—';
    const tokens   = (l.prompt_tokens || 0) + (l.completion_tokens || 0);
    return {
      id:     String(i),
      time,
      model:  l.model || '—',
      key:    keyShort,
      tokens: tokens.toLocaleString(),
      cost:   '$' + (l.spend || 0).toFixed(4),
    };
  });

  return (
    <>
      <PageHeader title="Usage" description="AI API cost and token usage tracking" />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <StatCard
              label="Monthly Spend"
              value={'$' + (typeof totalSpend === 'number' ? totalSpend.toFixed(4) : '0.00')}
              sub="USD"
            />
            <StatCard
              label="Total Requests"
              value={totalReqs.toLocaleString()}
              sub="Requests"
            />
            <StatCard
              label="Token Usage"
              value={`${totalTokensIn.toLocaleString()} / ${totalTokensOut.toLocaleString()}`}
              sub="Input / Output tokens"
            />
          </div>

          {/* By model */}
          <div style={{ marginTop: '2rem' }}>
            {modelKeys.length > 0 ? (
              <CardSection title="Usage by Model">
                <DataTable rows={modelRows} headers={modelHeaders}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} size="sm">
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
                            {row.cells.map(cell => (
                              <TableCell key={cell.id}>
                                {cell.info.header === 'model'
                                  ? <span style={{ fontWeight: 500 }}>{cell.value}</span>
                                  : cell.value
                                }
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </CardSection>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem', background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
                No usage data yet. Make API calls to see usage here.
              </div>
            )}
          </div>

          {/* Recent logs */}
          {logs.length > 0 ? (
            <CardSection title={`Recent Request Logs (${Math.min(logs.length, 50)} entries)`}>
              <DataTable rows={logRows} headers={logHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <Table {...getTableProps()} size="sm">
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
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'key'
                                ? <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{cell.value}</span>
                                : cell.info.header === 'time'
                                  ? <span style={{ color: 'var(--cds-text-secondary)' }}>{cell.value}</span>
                                  : cell.info.header === 'model'
                                    ? <span style={{ fontWeight: 500 }}>{cell.value}</span>
                                    : cell.value
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            </CardSection>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem', background: '#fff', border: '1px solid #e0e0e0' }}>
              No request logs available. Add models and make API calls to track usage.
            </div>
          )}
        </>
      )}
    </>
  );
}
