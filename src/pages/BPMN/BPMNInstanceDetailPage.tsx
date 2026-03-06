// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Modal,
  TextInput,
  Dropdown,
} from '@carbon/react';
import { Renew, Edit, TrashCan } from '@carbon/icons-react';
import BpmnViewer from '../../components/BpmnViewer';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function MetaItem({ label, value, link }: { label: string; value: any; link?: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-helper)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-primary)', wordBreak: 'break-all' }}>
        {link ? (
          <a href={link} style={{ color: '#0f62fe', textDecoration: 'none' }}>{value ?? 'null'}</a>
        ) : (
          value != null ? String(value) : 'null'
        )}
      </div>
    </div>
  );
}

function extractActivityIds(node: any): string[] {
  if (!node) return [];
  const ids: string[] = [];
  if (node.activityId) ids.push(node.activityId);
  if (Array.isArray(node.childActivityInstances)) {
    node.childActivityInstances.forEach((child: any) => {
      ids.push(...extractActivityIds(child));
    });
  }
  return ids;
}

const VAR_TYPES = ['String', 'Integer', 'Long', 'Double', 'Boolean', 'Date', 'Bytes', 'File', 'Object', 'Null'];

export default function BPMNInstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<any>(null);
  const [xml, setXml] = useState<string>('');
  const [activeActivityIds, setActiveActivityIds] = useState<string[]>([]);
  const [incidentActivityIds, setIncidentActivityIds] = useState<string[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit variable modal
  const [editVar, setEditVar] = useState<any>(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState('String');
  const [editLoading, setEditLoading] = useState(false);

  // Delete instance modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Suspend loading
  const [suspendLoading, setSuspendLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const instData = await apiFetch(`/instances/${id}`);
      setInstance(instData);

      const [xmlData, activityData, varData, incidentData, taskData, jobData] = await Promise.allSettled([
        apiFetch(`/processes/${instData?.processDefinitionId}/xml`),
        apiFetch(`/instances/${id}/activity-instances`),
        apiFetch(`/instances/${id}/variables`),
        apiFetch(`/incidents?processInstanceId=${id}`),
        apiFetch(`/tasks?processInstanceId=${id}`),
        apiFetch(`/jobs?processInstanceId=${id}`),
      ]);

      if (xmlData.status === 'fulfilled') setXml(xmlData.value?.bpmn20Xml || '');

      if (activityData.status === 'fulfilled') {
        const ids = extractActivityIds(activityData.value);
        setActiveActivityIds(ids);
      }

      if (varData.status === 'fulfilled') {
        const v = varData.value;
        if (v && typeof v === 'object') {
          const arr = Object.entries(v).map(([name, val]: [string, any]) => ({
            name,
            type: val?.type || 'String',
            value: val?.value,
            valueInfo: val?.valueInfo,
          }));
          setVariables(arr);
        }
      }

      if (incidentData.status === 'fulfilled') {
        const inc = Array.isArray(incidentData.value) ? incidentData.value : [];
        setIncidents(inc);
        setIncidentActivityIds(inc.map((i: any) => i.activityId).filter(Boolean));
      }

      if (taskData.status === 'fulfilled') {
        setUserTasks(Array.isArray(taskData.value) ? taskData.value : []);
      }

      if (jobData.status === 'fulfilled') {
        setJobs(Array.isArray(jobData.value) ? jobData.value : []);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSuspend = async () => {
    if (!id) return;
    setSuspendLoading(true);
    try {
      await apiFetch(`/instances/${id}/suspended`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: true }),
      });
      await load();
    } catch (e: any) {
      alert('오류: ' + e.message);
    }
    setSuspendLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/instances/${id}`, { method: 'DELETE' });
      navigate('/bpmn/instances');
    } catch (e: any) {
      alert('오류: ' + e.message);
      setDeleteLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editVar || !id) return;
    setEditLoading(true);
    try {
      await apiFetch(`/instances/${id}/variables/${editVar.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue, type: editType }),
      });
      setEditVar(null);
      await load();
    } catch (e: any) {
      alert('오류: ' + e.message);
    }
    setEditLoading(false);
  };

  const handleDeleteVar = async (varName: string) => {
    if (!window.confirm(`변수 "${varName}"을 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/instances/${id}/variables/${varName}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      alert('오류: ' + e.message);
    }
  };

  const instShort = id ? id.slice(0, 8) : '';
  const procName = instance?.processDefinitionKey || instance?.processDefinitionId || '';

  // Variable rows
  const varRows = variables.map((v, i) => ({
    id: String(i),
    name: v.name,
    type: v.type,
    value: v.type === 'Object' || v.type === 'Bytes'
      ? (v.valueInfo?.objectTypeName || v.type)
      : v.type === 'File'
        ? 'Download'
        : String(v.value ?? ''),
    scope: id || '',
    _var: v,
  }));

  // Incident rows
  const incidentRows = incidents.map((inc, i) => ({
    id: String(i),
    message: inc.message || inc.incidentMessage || '—',
    activityId: inc.activityId || '—',
    timestamp: inc.incidentTimestamp || inc.createTime
      ? new Date(inc.incidentTimestamp || inc.createTime).toLocaleString('ko-KR')
      : '—',
  }));

  // User task rows
  const taskRows = userTasks.map((t, i) => ({
    id: String(i),
    name: t.name || t.taskDefinitionKey || '—',
    assignee: t.assignee || '—',
    created: t.created ? new Date(t.created).toLocaleString('ko-KR') : '—',
    dueDate: t.due ? new Date(t.due).toLocaleString('ko-KR') : '—',
    followUp: t.followUp ? new Date(t.followUp).toLocaleString('ko-KR') : '—',
    _taskId: t.id,
  }));

  // Job rows
  const jobRows = jobs.map((j, i) => ({
    id: String(i),
    jobId: j.id || '—',
    activityId: j.activityId || j.jobDefinitionId || '—',
    type: j.type || '—',
    dueDate: j.dueDate ? new Date(j.dueDate).toLocaleString('ko-KR') : '—',
    retries: String(j.retries ?? '—'),
  }));

  return (
    <>
      <PageHeader
        title={`${instShort} : Runtime`}
        description={
          <span style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn')}>Dashboard</span>
            {' > '}
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn/processes')}>Processes</span>
            {' > '}
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate(-1)}>{procName}</span>
            {' > '}
            <span style={{ color: 'var(--cds-text-primary)' }}>{instShort} : Runtime</span>
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button kind="ghost" renderIcon={Renew} onClick={load}>
              새로고침
            </Button>
            <Button
              kind="secondary"
             
              disabled={suspendLoading || instance?.suspended}
              onClick={handleSuspend}
            >
              인스턴스 일시정지
            </Button>
            <Button kind="danger" onClick={() => setShowDeleteModal(true)}>
              인스턴스 삭제
            </Button>
          </div>
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
            flexShrink: 0,
          }}>
            {/* Sidebar tabs */}
            <Tabs>
              <TabList contained aria-label="Instance sidebar tabs">
                <Tab>Information</Tab>
                <Tab>Filter</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <div style={{ padding: '1rem' }}>
                    <MetaItem label="Instance ID" value={instance?.id} />
                    <MetaItem label="Business Key" value={instance?.businessKey} />
                    <MetaItem label="Definition Version" value={instance?.processDefinitionVersion ?? instance?.definitionVersion} />
                    <MetaItem label="Definition ID" value={instance?.processDefinitionId} />
                    <MetaItem label="Definition Key" value={instance?.processDefinitionKey} />
                    <MetaItem label="Definition Name" value={instance?.processDefinitionName} />
                    <MetaItem label="Tenant ID" value={instance?.tenantId} />
                    <MetaItem
                      label="Deployment ID"
                      value={instance?.deploymentId}
                      link={instance?.deploymentId ? `/bpmn/deployments/${instance.deploymentId}` : undefined}
                    />
                    <MetaItem label="Super Process Instance ID" value={instance?.superProcessInstanceId} />
                  </div>
                </TabPanel>
                <TabPanel>
                  <div style={{ padding: '1rem', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                    추후 구현 예정
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
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
                  height="450px"
                />
              ) : (
                <div style={{ height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cds-text-secondary)', border: '1px solid #e0e0e0', background: '#fafafa' }}>
                  BPMN XML을 불러올 수 없습니다.
                </div>
              )}
            </div>

            {/* Bottom Tabs */}
            <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0' }}>
              <Tabs>
                <TabList contained aria-label="Instance detail tabs">
                  <Tab>Variables ({variables.length})</Tab>
                  <Tab>Incidents ({incidents.length})</Tab>
                  <Tab>Called Process Instances</Tab>
                  <Tab>User Tasks ({userTasks.length})</Tab>
                  <Tab>Jobs ({jobs.length})</Tab>
                  <Tab>External Tasks</Tab>
                </TabList>
                <TabPanels>
                  {/* Variables */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      {varRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          변수가 없습니다.
                        </div>
                      ) : (
                        <DataTable
                          rows={varRows.map(r => ({ id: r.id, name: r.name, type: r.type, value: r.value, scope: r.scope }))}
                          headers={[
                            { key: 'name', header: 'Name' },
                            { key: 'type', header: 'Type' },
                            { key: 'value', header: 'Value' },
                            { key: 'scope', header: 'Scope' },
                            { key: 'actions', header: 'Actions' },
                          ]}
                        >
                          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                            <Table {...getTableProps()}>
                              <TableHead>
                                <TableRow>
                                  {headers.map(h => (
                                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {rows.map((row, rowIdx) => {
                                  const orig = varRows[rowIdx];
                                  return (
                                    <TableRow key={row.id} {...getRowProps({ row })}>
                                      {row.cells.map(cell => (
                                        <TableCell key={cell.id}>
                                          {cell.info.header === 'actions' ? (
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                              <Button
                                                kind="ghost"
                                               
                                                renderIcon={Edit}
                                                iconDescription="편집"
                                                hasIconOnly
                                                onClick={() => {
                                                  setEditVar(orig._var);
                                                  setEditValue(String(orig._var.value ?? ''));
                                                  setEditType(orig._var.type || 'String');
                                                }}
                                              />
                                              <Button
                                                kind="ghost"
                                               
                                                renderIcon={TrashCan}
                                                iconDescription="삭제"
                                                hasIconOnly
                                                onClick={() => handleDeleteVar(orig._var.name)}
                                              />
                                            </div>
                                          ) : cell.info.header === 'scope' ? (
                                            <span style={{ fontSize: '0.75rem', color: '#0f62fe', fontFamily: 'monospace' }}>
                                              {(cell.value || '').slice(0, 8)}...
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
                        <DataTable
                          rows={incidentRows}
                          headers={[
                            { key: 'message', header: 'Message' },
                            { key: 'activityId', header: 'Activity' },
                            { key: 'timestamp', header: 'Timestamp' },
                          ]}
                        >
                          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                            <Table {...getTableProps()}>
                              <TableHead>
                                <TableRow>
                                  {headers.map(h => (
                                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
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

                  {/* Called Process Instances */}
                  <TabPanel>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      호출된 하위 프로세스 인스턴스가 없습니다.
                    </div>
                  </TabPanel>

                  {/* User Tasks */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      {taskRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          사용자 태스크가 없습니다.
                        </div>
                      ) : (
                        <DataTable
                          rows={taskRows.map(r => ({ id: r.id, name: r.name, assignee: r.assignee, created: r.created, dueDate: r.dueDate, followUp: r.followUp }))}
                          headers={[
                            { key: 'name', header: 'Name' },
                            { key: 'assignee', header: 'Assignee' },
                            { key: 'created', header: 'Created' },
                            { key: 'dueDate', header: 'Due Date' },
                            { key: 'followUp', header: 'Follow Up' },
                          ]}
                        >
                          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                            <Table {...getTableProps()}>
                              <TableHead>
                                <TableRow>
                                  {headers.map(h => (
                                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                                  ))}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {rows.map((row, rowIdx) => {
                                  const orig = taskRows[rowIdx];
                                  return (
                                    <TableRow
                                      key={row.id}
                                      {...getRowProps({ row })}
                                      style={{ cursor: orig?._taskId ? 'pointer' : 'default' }}
                                      onClick={() => orig?._taskId && navigate(`/bpmn/tasks/${orig._taskId}`)}
                                    >
                                      {row.cells.map(cell => (
                                        <TableCell key={cell.id}>{cell.value}</TableCell>
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

                  {/* Jobs */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      {jobRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          잡이 없습니다.
                        </div>
                      ) : (
                        <DataTable
                          rows={jobRows.map(r => ({ id: r.id, jobId: r.jobId, activityId: r.activityId, type: r.type, dueDate: r.dueDate, retries: r.retries }))}
                          headers={[
                            { key: 'jobId', header: 'ID' },
                            { key: 'activityId', header: 'Activity' },
                            { key: 'type', header: 'Type' },
                            { key: 'dueDate', header: 'Due Date' },
                            { key: 'retries', header: 'Retries' },
                          ]}
                        >
                          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                            <Table {...getTableProps()}>
                              <TableHead>
                                <TableRow>
                                  {headers.map(h => (
                                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
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

                  {/* External Tasks */}
                  <TabPanel>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                      외부 태스크가 없습니다.
                    </div>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variable Modal */}
      {editVar && (
        <Modal
          open={!!editVar}
          modalHeading="변수 편집"
          primaryButtonText={editLoading ? '저장 중...' : '저장'}
          secondaryButtonText="취소"
          onRequestSubmit={handleEditSave}
          onRequestClose={() => setEditVar(null)}
          onSecondarySubmit={() => setEditVar(null)}
          primaryButtonDisabled={editLoading}
        >
          <div style={{ marginBottom: '1rem' }}>
            <TextInput
              id="edit-var-name"
              labelText="변수명"
              value={editVar.name}
              readOnly
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <TextInput
              id="edit-var-value"
              labelText="Value"
              value={editValue}
              onChange={(e: any) => setEditValue(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <Dropdown
              id="edit-var-type"
              titleText="Type"
              label="타입 선택"
              items={VAR_TYPES}
              selectedItem={editType}
              onChange={({ selectedItem }: any) => setEditType(selectedItem)}
            />
          </div>
        </Modal>
      )}

      {/* Delete Instance Modal */}
      <Modal
        open={showDeleteModal}
        danger
        modalHeading="인스턴스 삭제"
        primaryButtonText={deleteLoading ? '삭제 중...' : '삭제'}
        secondaryButtonText="취소"
        onRequestSubmit={handleDelete}
        onRequestClose={() => setShowDeleteModal(false)}
        onSecondarySubmit={() => setShowDeleteModal(false)}
        primaryButtonDisabled={deleteLoading}
      >
        <p style={{ fontSize: '0.875rem' }}>
          인스턴스 <strong>{id}</strong>를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
      </Modal>
    </>
  );
}
