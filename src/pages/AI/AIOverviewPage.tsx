import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { Bot } from '@carbon/icons-react';
import { aiApi } from '../../api/ai';
import { apiFetch } from '../../api/client';
import type { Agent } from '../../api/ai';

interface EngineStatus {
  engines?: {
    litellm?: { status: string; version?: string };
  };
}

export default function AIOverviewPage() {
  const navigate = useNavigate();
  const { installedServices } = useAppStore();

  const [health,       setHealth]       = useState<string>('unknown');
  const [version,      setVersion]      = useState<string>('—');
  const [modelCount,   setModelCount]   = useState<number>(0);
  const [keyCount,     setKeyCount]     = useState<number>(0);
  const [agentCount,   setAgentCount]   = useState<number>(0);
  const [agentStatus,  setAgentStatus]  = useState<string>('unknown');
  const [agents,       setAgents]       = useState<Agent[]>([]);
  const [memoryCount,  setMemoryCount]  = useState<number>(0);
  const [memoryStatus, setMemoryStatus] = useState<string>('unknown');
  const [monthlySpend, setMonthlySpend] = useState<string>('$0.00');
  const [loading,      setLoading]      = useState(true);

  // 서비스 설치 여부 확인
  const isServiceInstalled = installedServices.includes('ai');

  // 미설치 서비스인 경우 EmptyState 표시
  if (!isServiceInstalled) {
    return (
      <>
        <PageHeader
          title="AI Platform"
          description="PolyON AI 플랫폼 — 모델, 에이전트, 메모리 통합 관리"
        />
        <div style={{ padding: '2rem 0' }}>
          <EmptyState
            icon={Bot}
            title="이 서비스는 아직 설치되지 않았습니다"
            description="AI Platform은 현재 설치되지 않았습니다. Applications에서 설치할 수 있습니다."
            actionLabel="Applications로 이동"
            onAction={() => navigate('/apps')}
          />
        </div>
      </>
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Settings / model & key count
      try {
        const d = await aiApi.getSettings();
        setHealth(d.health?.status || 'unknown');
        setModelCount(d.modelCount || 0);
        setKeyCount(d.keyCount || 0);
      } catch {}

      // Engine version
      try {
        const d = await apiFetch<EngineStatus>('/engines/status');
        setVersion(d.engines?.litellm?.version || '—');
        if (!health || health === 'unknown') {
          setHealth(d.engines?.litellm?.status || 'unknown');
        }
      } catch {}

      // Agents
      try {
        const d = await aiApi.getAgents();
        const list = d.agents || [];
        setAgents(list);
        setAgentCount(d.count || list.length);
        const active = list.filter((a: Agent) => a.status === 'healthy');
        setAgentStatus(active.length > 0 ? 'healthy' : (list.length > 0 ? 'down' : 'unknown'));
      } catch {}

      // Memory
      try {
        const d = await aiApi.getMemoryStats();
        setMemoryCount(d.count || 0);
        setMemoryStatus(d.status || 'unknown');
      } catch {}

      // Spend
      try {
        const d = await aiApi.getUsageGlobal();
        const spend = d?.spend || d?.total_spend || 0;
        setMonthlySpend('$' + (typeof spend === 'number' ? spend.toFixed(2) : '0.00'));
      } catch {}

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statStyle: React.CSSProperties = {
    background: '#fff',
    border:     '1px solid #e0e0e0',
    padding:    '1.25rem',
  };

  // Agent DataTable
  const agentHeaders = [
    { key: 'name',   header: 'Agent' },
    { key: 'model',  header: 'Model' },
    { key: 'status', header: 'Status' },
    { key: 'memory', header: 'Memory' },
  ];

  const agentRows = agents.length > 0
    ? agents.map((a, i) => ({
        id:     String(i),
        name:   a.name || a.id,
        model:  a.id,   // used to render code + sub label
        status: a.status,
        memory: `${a.memory_mb || 768} MB`,
      }))
    : [{ id: '0', name: '', model: '', status: '', memory: '' }];

  // Endpoint StructuredList rows
  const endpoints = [
    { name: 'Chat Completions', method: 'POST', path: '/v1/chat/completions',    desc: 'OpenAI compatible' },
    { name: 'Embeddings',       method: 'POST', path: '/v1/embeddings',           desc: 'Vector embeddings' },
    { name: 'Models',           method: 'GET',  path: '/v1/models',               desc: 'Model list' },
    { name: 'Image Generation', method: 'POST', path: '/v1/images/generations',   desc: 'DALL-E compatible' },
  ];

  return (
    <>
      <PageHeader
        title="AI Platform"
        description={`PolyON AI 플랫폼 — 모델, 에이전트, 메모리 통합 관리`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={health as 'healthy' | 'down' | 'unknown' | 'warning'} />
            <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
              LiteLLM v{version}
            </span>
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
          Loading...
        </div>
      ) : (
        <>
          {/* 6-stat grid */}
          <div style={{
            display:         'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap:             1,
            marginTop:       '1.5rem',
            background:      '#e0e0e0',
            border:          '1px solid #e0e0e0',
          }}>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Gateway
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 300, marginTop: '0.5rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                LiteLLM
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <StatusBadge status={health as 'healthy' | 'down' | 'unknown' | 'warning'} />
              </div>
            </div>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Registered Models
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{modelCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>Models</div>
            </div>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Active Agents
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem', color: agentStatus === 'healthy' ? '#24a148' : 'inherit' }}>
                {agentCount}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <StatusBadge status={agentStatus as 'healthy' | 'down' | 'unknown' | 'warning'} />
              </div>
            </div>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                AI Memory
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>
                {memoryCount.toLocaleString()}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <StatusBadge status={memoryStatus as 'healthy' | 'down' | 'unknown' | 'warning'} />
              </div>
            </div>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                API Keys
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{keyCount}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>Active Keys</div>
            </div>
            <div style={statStyle}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-helper)' }}>
                Monthly Spend
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{monthlySpend}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>USD</div>
            </div>
          </div>

          {/* Agents + Routing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            {/* Agent list */}
            <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Agent Status</h4>
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => navigate('/ai/agents')}
                >
                  View all
                </Button>
              </div>

              {agents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>
                  No agents found
                </div>
              ) : (
                <DataTable rows={agentRows} headers={agentHeaders}>
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
                        {rows.map((row, ri) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map(cell => {
                              const agent = agents[ri];
                              if (cell.info.header === 'name') {
                                return (
                                  <TableCell key={cell.id}>
                                    <span style={{ fontWeight: 600 }}>{cell.value}</span>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'model') {
                                return (
                                  <TableCell key={cell.id}>
                                    <code style={{ background: '#f4f4f4', padding: '2px 6px', fontSize: '0.6875rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                                      polyon-default
                                    </code>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>Gemini 2.5 Flash</div>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'status') {
                                return (
                                  <TableCell key={cell.id}>
                                    <StatusBadge status={agent?.status as 'healthy' | 'down' | 'unknown' | 'warning'} />
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={cell.id} style={{ color: 'var(--cds-text-secondary)' }}>
                                  {cell.value}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Quick Actions</h4>
              </div>
              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Model Pipeline',  path: '/ai/pipeline',  desc: 'Visual model routing', color: '#0f62fe' },
                  { label: 'Models',          path: '/ai/models',    desc: 'Registered models',    color: '#10a37f' },
                  { label: 'API Keys',        path: '/ai/keys',      desc: 'Manage access keys',   color: '#6929c4' },
                  { label: 'Usage',           path: '/ai/usage',     desc: 'Cost & token usage',   color: '#f1c21b' },
                  { label: 'Memory',          path: '/ai/memory',    desc: 'Mem0 vector store',    color: '#da1e28' },
                  { label: 'Settings',        path: '/ai/settings',  desc: 'Providers & config',   color: '#525252' },
                ].map(item => (
                  <Button
                    key={item.path}
                    kind="ghost"
                    onClick={() => navigate(item.path)}
                    style={{
                      background:  '#f4f4f4',
                      border:      '1px solid #e0e0e0',
                      borderLeft:  `3px solid ${item.color}`,
                      padding:     '0.75rem 1rem',
                      textAlign:   'left',
                      display:     'flex',
                      flexDirection: 'column',
                      alignItems:  'flex-start',
                      height:      'auto',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#161616' }}>{item.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>{item.desc}</div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Endpoints — StructuredList */}
          <div style={{ marginTop: '1rem', background: '#fff', border: '1px solid #e0e0e0' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>LiteLLM Endpoints</h4>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <StructuredListWrapper>
                <StructuredListBody>
                  {endpoints.map(ep => (
                    <StructuredListRow key={ep.path}>
                      <StructuredListCell>
                        <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{ep.name}</span>
                      </StructuredListCell>
                      <StructuredListCell>
                        <span style={{
                          background: ep.method === 'GET' ? '#d0e2ff' : '#d4bbff',
                          color:      ep.method === 'GET' ? '#0043ce' : '#6929c4',
                          padding:    '1px 6px',
                          fontSize:   '0.6875rem',
                          fontWeight: 600,
                        }}>
                          {ep.method}
                        </span>
                      </StructuredListCell>
                      <StructuredListCell>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>{ep.path}</span>
                      </StructuredListCell>
                      <StructuredListCell>
                        <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>{ep.desc}</span>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              </StructuredListWrapper>
            </div>
          </div>
        </>
      )}
    </>
  );
}
