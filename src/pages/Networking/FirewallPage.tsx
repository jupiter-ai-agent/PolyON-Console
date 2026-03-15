// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import {
  Button,
  Toggle,
  Tag,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';

interface FirewallService {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  port: number;
  path?: string;
  exposed: boolean;
  essential?: boolean;
}

const CATEGORIES: Record<string, { label: string }> = {
  management: { label: '관리' },
  mail:       { label: '메일' },
  auth:       { label: '인증' },
  monitoring: { label: '모니터링' },
  storage:    { label: '스토리지' },
  other:      { label: '기타' },
};

// Firewall DataTable headers
const fwHeaders = [
  { key: 'service',  header: '서비스' },
  { key: 'protocol', header: '프로토콜' },
  { key: 'access',   header: '외부 접근' },
  { key: 'statusTag',header: '상태' },
  { key: 'toggle',   header: '노출' },
];

export default function FirewallPage() {
  const [services, setServices] = useState<FirewallService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/firewall/services') as any;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setServices(d.services || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (svc: FirewallService, newVal: boolean) => {
    if (svc.essential) return;
    setToggling(svc.id);
    try {
      const res = await apiFetch('/firewall/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: svc.id, exposed: newVal }),
      });
      const d = await res.json();
      if (d.success) {
        setServices(prev => prev.map(s => s.id === svc.id ? { ...s, exposed: newVal } : s));
      }
    } catch { /* ignore */ }
    setToggling(null);
  };

  const exposed = services.filter(s => s.exposed).length;
  const local   = services.filter(s => !s.exposed).length;

  // Group by category
  const grouped: Record<string, FirewallService[]> = {};
  for (const svc of services) {
    const cat = svc.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(svc);
  }

  const statStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #e0e0e0', padding: '1.25rem',
  };

  return (
    <>
      <PageHeader
        title="Firewall Rules"
        description="서비스별 외부 네트워크 노출을 제어합니다. 토글 변경 시 Traefik 게이트웨이를 통해 즉시 반영됩니다."
        actions={
          <Button kind="ghost" onClick={load}>새로고침</Button>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0', marginTop: '1.5rem', marginBottom: '1rem' }}>
        <div style={statStyle}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#da1e28' }}>외부 노출</div>
          <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{loading ? '—' : exposed}</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#6929c4' }}>로컬 전용</div>
          <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{loading ? '—' : local}</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: '#525252' }}>전체 서비스</div>
          <div style={{ fontSize: '2rem', fontWeight: 300, marginTop: '0.5rem' }}>{loading ? '—' : services.length}</div>
        </div>
      </div>

      {/* Traefik info */}
      <div style={{ padding: '0.625rem 1rem', background: '#edf5ff', border: '1px solid #d0e2ff', marginBottom: '1rem', fontSize: '0.75rem', color: '#0043ce', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ℹ️ Traefik 게이트웨이 — 토글 변경 시 <strong>즉시 반영</strong>됩니다. 컨테이너 재시작이 필요하지 않습니다.
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28', fontSize: '0.875rem' }}>오류: {error}</div>
      ) : services.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem', background: '#fff', border: '1px solid #e0e0e0' }}>
          서비스 목록을 불러올 수 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(grouped).map(([catKey, svcs]) => {
            const cat = CATEGORIES[catKey] || { label: catKey };

            // Build DataTable rows for this category
            const rows = svcs.map(svc => ({
              id: svc.id,
              service: (
                <div>
                  <div style={{ fontWeight: 500 }}>{svc.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '0.125rem' }}>{svc.description}</div>
                  {svc.essential && (
                    <Tag type="green">필수</Tag>
                  )}
                </div>
              ),
              protocol: (
                <Tag type={svc.type === 'tcp' ? 'purple' : 'blue'}>
                  {(svc.type || 'HTTP').toUpperCase()}
                </Tag>
              ),
              access: (
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
                  :{svc.port}{svc.path || ''}
                </span>
              ),
              statusTag: (
                <Tag type={svc.exposed ? 'blue' : 'gray'}>
                  {svc.exposed ? '외부 노출' : '로컬 전용'}
                </Tag>
              ),
              toggle: (
                <Toggle
                  id={`firewall-toggle-${svc.id}`}
                  toggled={svc.exposed}
                  disabled={!!svc.essential || toggling === svc.id}
                  onToggle={(checked) => handleToggle(svc, checked)}
                  hideLabel
                  labelText={svc.name}
                 
                />
              ),
            }));

            return (
              <div key={catKey} style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
                <div style={{
                  padding: '0.75rem 1.25rem', background: '#f4f4f4',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>{svcs.length}개 서비스</span>
                </div>
                <DataTable rows={rows} headers={fwHeaders}>
                  {({ rows: tRows, headers: tHeaders, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} style={{ fontSize: '0.8125rem' }}>
                      <TableHead>
                        <TableRow>
                          {tHeaders.map(h => (
                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                              {h.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tRows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => (
                              <TableCell
                                key={cell.id}
                                style={cell.info.header === 'toggle' ? { textAlign: 'center' } : undefined}
                              >
                                {cell.value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
