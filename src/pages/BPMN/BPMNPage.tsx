// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
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
  Tag,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { useAppStore } from '../../store/useAppStore';
import { Code } from '@carbon/icons-react';

const BASE = '/api/v1/engines/bpmn';

async function bpmnFetch(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Clickable big stat card (Right Now style)
function BigStatCard({ label, value, alert, onClick }: { label: string; value: any; alert?: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isAlert = alert && Number(value) > 0;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#e8f0fe' : '#fff',
        border: '1px solid #e0e0e0',
        borderLeft: isAlert ? '3px solid #da1e28' : undefined,
        padding: '1.5rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>{label}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 300, marginTop: '0.5rem', color: isAlert ? '#da1e28' : '#161616' }}>
        {value}
      </div>
    </div>
  );
}

// Small deployed stat card
function DeployedCard({ label, value, onClick }: { label: string; value: any; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#e8f0fe' : '#f4f4f4',
        border: '1px solid #e0e0e0',
        padding: '1rem 1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 300, marginTop: '0.25rem', color: '#161616' }}>
        {value}
      </div>
    </div>
  );
}

const processHeaders = [
  { key: 'name', header: '이름' },
  { key: 'key', header: '키' },
  { key: 'version', header: '버전' },
  { key: 'deploymentId', header: '배포 ID' },
];

export default function BPMNPage() {
  const navigate = useNavigate();
  const { installedServices } = useAppStore();
  const humanTasksRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<string>('unknown');
  const [engineName, setEngineName] = useState<string>('default');
  const [processes, setProcesses] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 서비스 설치 여부 확인
  const isServiceInstalled = installedServices.includes('bpmn');

  // 미설치 서비스인 경우 EmptyState 표시
  if (!isServiceInstalled) {
    return (
      <>
        <PageHeader
          title="BPMN 엔진"
          description="Operaton — 프로세스 자동화 플랫폼"
          actions={<StatusBadge status="unknown" />}
        />
        <div style={{ padding: '2rem 0' }}>
          <EmptyState
            icon={Code}
            title="이 서비스는 아직 설치되지 않았습니다"
            description="BPMN 엔진(Operaton)은 현재 설치되지 않았습니다. Applications에서 설치할 수 있습니다."
            actionLabel="Applications로 이동"
            onAction={() => navigate('/apps')}
          />
        </div>
      </>
    );
  }

  // Human tasks assignment stats
  const [assignedToUser, setAssignedToUser] = useState(0);
  const [assignedToGroup, setAssignedToGroup] = useState(0);
  const [unassigned, setUnassigned] = useState(0);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const engines = await bpmnFetch('/engine');
        const eList = Array.isArray(engines) ? engines : [];
        setStatus(eList.length > 0 ? 'healthy' : 'down');
        setEngineName(eList[0]?.name || 'default');
      } catch { setStatus('down'); }

      try {
        const [pRes, iRes, incRes, tRes, dRes] = await Promise.all([
          bpmnFetch('/processes?maxResults=200'),
          bpmnFetch('/instances?maxResults=200'),
          bpmnFetch('/incidents'),
          bpmnFetch('/tasks?maxResults=500'),
          bpmnFetch('/deployments?maxResults=200').catch(() => []),
        ]);
        setProcesses(Array.isArray(pRes) ? pRes : []);
        setInstances(Array.isArray(iRes) ? iRes : []);
        setIncidents(Array.isArray(incRes) ? incRes : []);
        setDeployments(Array.isArray(dRes) ? dRes : []);

        const allTasks = Array.isArray(tRes) ? tRes : [];
        setTasks(allTasks);

        // Compute assignment stats
        let u = 0, g = 0, un = 0;
        const gc: Record<string, number> = {};

        for (const t of allTasks) {
          if (t.assignee) {
            u++;
          } else if (t.candidateGroups && t.candidateGroups.length > 0) {
            g++;
            for (const grp of t.candidateGroups) {
              gc[grp] = (gc[grp] || 0) + 1;
            }
          } else if (t.candidateGroup) {
            // single group field
            g++;
            gc[t.candidateGroup] = (gc[t.candidateGroup] || 0) + 1;
          } else {
            un++;
          }
        }
        setAssignedToUser(u);
        setAssignedToGroup(g);
        setUnassigned(un);
        setGroupCounts(gc);
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  const processRows = processes.slice(0, 8).map((p, i) => ({
    id: String(i),
    name: p.name || '(없음)',
    key: p.key || '—',
    version: p.version ?? '—',
    deploymentId: p.deploymentId ? `${p.deploymentId.slice(0, 8)}...` : '—',
  }));

  const instanceRows = instances.slice(0, 8).map((inst, i) => ({
    id: String(i),
    instanceId: inst.id ? `${inst.id.slice(0, 8)}...` : '—',
    processDefinitionKey: inst.processDefinitionKey || '—',
    businessKey: inst.businessKey || '—',
    suspended: inst.suspended,
  }));

  // Unique process definition keys (approximate "Process Definitions" count)
  const uniqueProcessKeys = new Set(processes.map(p => p.key)).size || processes.length;

  // Decision definitions count (if endpoint exists; fallback 0)
  const [decisionDefs, setDecisionDefs] = useState(0);
  useEffect(() => {
    bpmnFetch('/decision-definition?maxResults=200')
      .then(r => setDecisionDefs(Array.isArray(r) ? r.length : 0))
      .catch(() => {});
  }, []);

  const scrollToHumanTasks = () => {
    humanTasksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader
        title="BPMN 엔진"
        description={`Operaton — 프로세스 자동화 플랫폼 (Engine: ${engineName})`}
        actions={<StatusBadge status={status as any} />}
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : (
        <>
          {/* ===== Right Now ===== */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)', marginBottom: '0.5rem' }}>
              Right Now
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0' }}>
              <BigStatCard
                label="Running Process Instances"
                value={instances.length}
                onClick={() => navigate('/bpmn/instances')}
              />
              <BigStatCard
                label="Open Incidents"
                value={incidents.length}
                alert
                onClick={() => navigate('/bpmn/incidents')}
              />
              <BigStatCard
                label="Open Human Tasks"
                value={tasks.length}
                onClick={() => navigate('/bpmn/tasks')}
              />
            </div>
          </div>

          {/* ===== Deployed ===== */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)', marginBottom: '0.5rem' }}>
              Deployed
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0' }}>
              <DeployedCard
                label="Process Definitions"
                value={uniqueProcessKeys}
                onClick={() => navigate('/bpmn/processes')}
              />
              <DeployedCard
                label="Decision Definitions"
                value={decisionDefs}
              />
              <DeployedCard
                label="Deployments"
                value={deployments.length}
                onClick={() => navigate('/bpmn/deployments')}
              />
              <DeployedCard
                label="Human Tasks"
                value={tasks.length}
                onClick={scrollToHumanTasks}
              />
            </div>
          </div>

          {/* ===== Incident warning ===== */}
          {incidents.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fff1f1', border: '1px solid #da1e28', borderLeft: '4px solid #da1e28', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#da1e28' }}>
                {incidents.length}개의 인시던트가 발생했습니다.
              </span>
              <Button kind="ghost" size="sm" onClick={() => navigate('/bpmn/incidents')}>
                인시던트 보기
              </Button>
            </div>
          )}

          {/* ===== Quick Actions ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
            {[
              { label: '프로세스 정의', path: '/bpmn/processes', color: '#0f62fe' },
              { label: '실행 인스턴스', path: '/bpmn/instances', color: '#24a148' },
              { label: '사용자 태스크', path: '/bpmn/tasks', color: '#6929c4' },
              { label: '실행 이력', path: '/bpmn/history', color: '#f1c21b' },
              { label: '인시던트', path: '/bpmn/incidents', color: '#da1e28' },
              { label: '배포 관리', path: '/bpmn/deployments', color: '#198038' },
            ].map(item => (
              <Button
                key={item.path}
                kind="ghost"
                onClick={() => navigate(item.path)}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderLeft: `3px solid ${item.color}`,
                  padding: '0.875rem 1rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  height: 'auto',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>{item.label}</div>
              </Button>
            ))}
          </div>

          {/* ===== Human Tasks Summary ===== */}
          <div ref={humanTasksRef} style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', background: '#fff', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Human Tasks</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/bpmn/tasks')}>
                전체 보기
              </Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#e0e0e0', border: '1px solid #e0e0e0', borderTop: 'none' }}>
              {/* Left: Assignments by type */}
              <div style={{ background: '#fff', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)', marginBottom: '0.75rem' }}>
                  Assignments by type
                </div>
                <StructuredListWrapper>
                  <StructuredListBody>
                    <StructuredListRow>
                      <StructuredListCell>assigned to a user</StructuredListCell>
                      <StructuredListCell>{assignedToUser}</StructuredListCell>
                    </StructuredListRow>
                    <StructuredListRow>
                      <StructuredListCell>assigned to 1 or more groups</StructuredListCell>
                      <StructuredListCell>{assignedToGroup}</StructuredListCell>
                    </StructuredListRow>
                    <StructuredListRow>
                      <StructuredListCell>unassigned</StructuredListCell>
                      <StructuredListCell>{unassigned}</StructuredListCell>
                    </StructuredListRow>
                    <StructuredListRow>
                      <StructuredListCell>
                        <strong>Total</strong>
                      </StructuredListCell>
                      <StructuredListCell>
                        <strong>{tasks.length}</strong>
                      </StructuredListCell>
                    </StructuredListRow>
                  </StructuredListBody>
                </StructuredListWrapper>
              </div>

              {/* Right: Assignments by group */}
              <div style={{ background: '#fff', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px', color: 'var(--cds-text-helper)', marginBottom: '0.75rem' }}>
                  Assignments by group
                </div>
                {Object.keys(groupCounts).length === 0 ? (
                  <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                    {assignedToGroup > 0 ? `${assignedToGroup}개 태스크 (그룹 상세 조회 불가)` : '그룹 할당된 태스크 없음'}
                  </div>
                ) : (
                  <StructuredListWrapper>
                    <StructuredListBody>
                      {Object.entries(groupCounts).map(([grp, cnt]) => (
                        <StructuredListRow key={grp}>
                          <StructuredListCell>{grp}</StructuredListCell>
                          <StructuredListCell>{cnt}</StructuredListCell>
                        </StructuredListRow>
                      ))}
                    </StructuredListBody>
                  </StructuredListWrapper>
                )}
              </div>
            </div>
          </div>

          {/* ===== Recent processes ===== */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 프로세스 정의</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/bpmn/processes')}>
                전체 보기
              </Button>
            </div>
            {processes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>프로세스 정의가 없습니다.</div>
            ) : (
              <DataTable rows={processRows} headers={processHeaders}>
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
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>

          {/* ===== Running instances ===== */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>실행 중 인스턴스</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/bpmn/instances')}>
                전체 보기
              </Button>
            </div>
            {instances.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>실행 중인 인스턴스가 없습니다.</div>
            ) : (
              <DataTable
                rows={instanceRows.map(r => ({
                  ...r,
                  status: r.suspended ? '일시정지' : '실행 중',
                }))}
                headers={[
                  { key: 'instanceId', header: 'ID' },
                  { key: 'processDefinitionKey', header: '프로세스 키' },
                  { key: 'businessKey', header: '비즈니스 키' },
                  { key: 'status', header: '상태' },
                ]}
              >
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
                      {rows.map((row, rowIdx) => {
                        const original = instanceRows[rowIdx];
                        return (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map(cell => (
                              <TableCell key={cell.id}>
                                {cell.info.header === 'status' ? (
                                  <Tag type={original?.suspended ? 'teal' : 'green'} size="sm">
                                    {cell.value}
                                  </Tag>
                                ) : (
                                  cell.value
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>
        </>
      )}
    </>
  );
}
