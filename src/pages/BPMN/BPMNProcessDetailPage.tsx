// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TextInput,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import BpmnViewer from '../../components/BpmnViewer';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

async function apiFetch(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function MetaItem({ label, value, link }: { label: string; value: any; link?: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-helper)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-primary)', wordBreak: 'break-all' }}>
        {link ? (
          <a href={link} style={{ color: '#0f62fe', textDecoration: 'none' }}>{value || '—'}</a>
        ) : (
          value || '—'
        )}
      </div>
    </div>
  );
}

const instanceHeaders = [
  { key: 'state', header: 'State' },
  { key: 'id', header: 'ID' },
  { key: 'startTime', header: 'Start Time' },
  { key: 'businessKey', header: 'Business Key' },
];

const incidentHeaders = [
  { key: 'message', header: 'Message' },
  { key: 'activityId', header: 'Activity' },
  { key: 'timestamp', header: 'Timestamp' },
];

const jobDefHeaders = [
  { key: 'activityId', header: 'Activity' },
  { key: 'type', header: 'Type' },
  { key: 'configuration', header: 'Configuration' },
  { key: 'state', header: 'State' },
];

export default function BPMNProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [process, setProcess] = useState<any>(null);
  const [xml, setXml] = useState<string>('');
  const [instances, setInstances] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instanceFilter, setInstanceFilter] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [procData, xmlData, instanceData, incidentData, statsData] = await Promise.allSettled([
        apiFetch(`/processes/${id}`),
        apiFetch(`/processes/${id}/xml`),
        apiFetch(`/instances?processDefinitionId=${id}&maxResults=500`),
        apiFetch(`/incidents`),
        apiFetch(`/stats`),
      ]);

      if (procData.status === 'fulfilled') setProcess(procData.value);
      if (xmlData.status === 'fulfilled') setXml(xmlData.value?.bpmn20Xml || '');
      if (instanceData.status === 'fulfilled') setInstances(Array.isArray(instanceData.value) ? instanceData.value : []);
      if (incidentData.status === 'fulfilled') {
        const all = Array.isArray(incidentData.value) ? incidentData.value : [];
        setIncidents(all.filter((inc: any) => inc.processDefinitionId === id));
      }
      if (statsData.status === 'fulfilled') {
        const all = Array.isArray(statsData.value) ? statsData.value : [];
        setStats(all.filter((s: any) => s.definition?.id === id || s.id === id));
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  // Build active activity ids from stats
  const activeActivityIds: string[] = [];
  const badgeMap: Record<string, number> = {};
  stats.forEach((stat: any) => {
    if (stat.taskCount > 0 && stat.id) {
      activeActivityIds.push(stat.id);
      badgeMap[stat.id] = stat.taskCount;
    }
    if (Array.isArray(stat.activityStatistics)) {
      stat.activityStatistics.forEach((a: any) => {
        if (a.instances > 0) {
          activeActivityIds.push(a.id);
          badgeMap[a.id] = a.instances;
        }
      });
    }
  });

  // Incident activity ids
  const incidentActivityIds = incidents.map((inc: any) => inc.activityId).filter(Boolean);

  const filteredInstances = instances.filter((inst: any) => {
    if (!instanceFilter) return true;
    const q = instanceFilter.toLowerCase();
    return (
      (inst.id || '').toLowerCase().includes(q) ||
      (inst.businessKey || '').toLowerCase().includes(q)
    );
  });

  const instanceRows = filteredInstances.map((inst: any, i: number) => ({
    id: String(i),
    state: inst.suspended ? '일시정지' : '활성',
    instanceId: inst.id || '—',
    startTime: inst.startTime ? new Date(inst.startTime).toLocaleString('ko-KR') : '—',
    businessKey: inst.businessKey || '—',
    suspended: inst.suspended,
    originalId: inst.id,
  }));

  const incidentRows = incidents.map((inc: any, i: number) => ({
    id: String(i),
    message: inc.message || '—',
    activityId: inc.activityId || '—',
    timestamp: inc.createTime ? new Date(inc.createTime).toLocaleString('ko-KR') : '—',
  }));

  const procName = process?.name || process?.key || id;
  const totalInstances = instances.length;

  return (
    <>
      <PageHeader
        title={procName || '프로세스 정의'}
        description={
          <span style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            <span
              style={{ cursor: 'pointer', color: '#0f62fe' }}
              onClick={() => navigate('/bpmn')}
            >Dashboard</span>
            {' > '}
            <span
              style={{ cursor: 'pointer', color: '#0f62fe' }}
              onClick={() => navigate('/bpmn/processes')}
            >Processes</span>
            {' > '}
            <span style={{ color: 'var(--cds-text-primary)' }}>{procName}</span>
            {' : Runtime'}
          </span>
        }
        actions={
          <Button kind="ghost" renderIcon={Renew} onClick={load}>
            새로고침
          </Button>
        }
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : (
        <div style={{ display: 'flex', gap: 0, marginTop: '1.5rem', border: '1px solid #e0e0e0' }}>
          {/* Sidebar */}
          <div style={{
            width: '220px',
            minWidth: '220px',
            background: '#fff',
            borderRight: '1px solid #e0e0e0',
            padding: '1rem',
            flexShrink: 0,
          }}>
            <MetaItem label="Definition Version" value={process?.version} />
            <MetaItem label="Version Tag" value={process?.versionTag} />
            <MetaItem label="Definition ID" value={process?.id} />
            <MetaItem label="Definition Key" value={process?.key} />
            <MetaItem label="Definition Name" value={process?.name} />
            <MetaItem label="History Time To Live" value={process?.historyTimeToLive} />
            <MetaItem label="Tenant ID" value={process?.tenantId} />
            <MetaItem
              label="Deployment ID"
              value={process?.deploymentId ? `${process.deploymentId.slice(0, 12)}...` : '—'}
            />
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-helper)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.25rem' }}>
                Instances Running
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-primary)' }}>
                current version: {totalInstances}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* BPMN Viewer */}
            <div style={{ background: '#fff' }}>
              {xml ? (
                <BpmnViewer
                  xml={xml}
                  activeActivityIds={activeActivityIds}
                  incidentActivityIds={incidentActivityIds}
                  badges={badgeMap}
                  height="500px"
                  onElementClick={(elementId) => console.log('element clicked:', elementId)}
                />
              ) : (
                <div style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cds-text-secondary)', border: '1px solid #e0e0e0', background: '#fafafa' }}>
                  BPMN XML을 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0' }}>
              <Tabs>
                <TabList contained aria-label="Process detail tabs">
                  <Tab>Process Instances ({instances.length})</Tab>
                  <Tab>Incidents ({incidents.length})</Tab>
                  <Tab>Called Process Definitions</Tab>
                  <Tab>Job Definitions</Tab>
                </TabList>
                <TabPanels>
                  {/* Process Instances */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ marginBottom: '1rem', maxWidth: '400px' }}>
                        <TextInput
                          id="instance-filter"
                          labelText=""
                          placeholder="ID 또는 Business Key로 검색..."
                          value={instanceFilter}
                          onChange={(e: any) => setInstanceFilter(e.target.value)}
                         
                        />
                      </div>
                      {instanceRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          실행 중인 인스턴스가 없습니다.
                        </div>
                      ) : (
                        <DataTable
                          rows={instanceRows.map(r => ({
                            id: r.id,
                            state: r.state,
                            instanceId: r.instanceId,
                            startTime: r.startTime,
                            businessKey: r.businessKey,
                          }))}
                          headers={[
                            { key: 'state', header: 'State' },
                            { key: 'instanceId', header: 'ID' },
                            { key: 'startTime', header: 'Start Time' },
                            { key: 'businessKey', header: 'Business Key' },
                          ]}
                        >
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
                                {rows.map((row, rowIdx) => {
                                  const orig = instanceRows[rowIdx];
                                  return (
                                    <TableRow
                                      key={row.id}
                                      {...getRowProps({ row })}
                                      style={{ cursor: orig?.originalId ? 'pointer' : 'default' }}
                                      onClick={() => orig?.originalId && navigate(`/bpmn/instances/${orig.originalId}`)}
                                    >
                                      {row.cells.map(cell => (
                                        <TableCell key={cell.id}>
                                          {cell.info.header === 'state' ? (
                                            <Tag type={orig?.suspended ? 'teal' : 'green'}>
                                              {cell.value}
                                            </Tag>
                                          ) : cell.info.header === 'instanceId' ? (
                                            <span style={{ color: '#0f62fe', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                              {cell.value}
                                            </span>
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
                  </TabPanel>

                  {/* Incidents */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      {incidentRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          인시던트가 없습니다.
                        </div>
                      ) : (
                        <DataTable rows={incidentRows} headers={incidentHeaders}>
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
                  </TabPanel>

                  {/* Called Process Definitions */}
                  <TabPanel>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      호출하는 하위 프로세스가 없습니다.
                    </div>
                  </TabPanel>

                  {/* Job Definitions */}
                  <TabPanel>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      잡 정의가 없습니다.
                    </div>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
