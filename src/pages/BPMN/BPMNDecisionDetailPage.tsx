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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

async function apiFetch(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function MetaItem({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-helper)', textTransform: 'uppercase', letterSpacing: '0.32px', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-primary)', wordBreak: 'break-all' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function parseDmnTable(xml: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const table = doc.querySelector('decisionTable');
    if (!table) return null;

    const inputs = Array.from(table.querySelectorAll(':scope > input')).map(el => ({
      label: el.querySelector('label')?.textContent || el.getAttribute('label') || 'Input',
      expression: el.querySelector('inputExpression text')?.textContent || '',
    }));

    const outputs = Array.from(table.querySelectorAll(':scope > output')).map(el => ({
      label: el.getAttribute('label') || el.getAttribute('name') || 'Output',
    }));

    const rules = Array.from(table.querySelectorAll(':scope > rule')).map(rule => ({
      inputs: Array.from(rule.querySelectorAll('inputEntry text')).map(t => t.textContent || ''),
      outputs: Array.from(rule.querySelectorAll('outputEntry text')).map(t => t.textContent || ''),
    }));

    return { inputs, outputs, rules };
  } catch { return null; }
}

const instanceHeaders = [
  { key: 'instanceId', header: 'ID' },
  { key: 'evaluationTime', header: 'Evaluation Time' },
  { key: 'processInstanceId', header: 'Process Instance' },
  { key: 'activityId', header: 'Activity' },
];

export default function BPMNDecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [decision, setDecision] = useState<any>(null);
  const [dmnXml, setDmnXml] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [defData, xmlData, histData] = await Promise.allSettled([
        apiFetch(`/decisions/${id}`),
        apiFetch(`/decisions/${id}/xml`),
        apiFetch(`/decisions/history?decisionDefinitionId=${id}&maxResults=200`),
      ]);

      if (defData.status === 'fulfilled') setDecision(defData.value);
      if (xmlData.status === 'fulfilled') setDmnXml(xmlData.value?.dmnXml || '');
      if (histData.status === 'fulfilled') setHistory(Array.isArray(histData.value) ? histData.value : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const parsed = dmnXml ? parseDmnTable(dmnXml) : null;

  const historyRows = history.map((h, i) => ({
    id: String(i),
    instanceId: h.id ? `${h.id.slice(0, 12)}...` : '—',
    evaluationTime: h.evaluationTime ? new Date(h.evaluationTime).toLocaleString('ko-KR') : '—',
    processInstanceId: h.processInstanceId ? `${h.processInstanceId.slice(0, 12)}...` : '—',
    activityId: h.activityId || '—',
  }));

  const defName = decision?.name || decision?.key || id;

  const dmnTableHeaders = parsed
    ? [
        ...parsed.inputs.map((inp, i) => ({ key: `input_${i}`, header: inp.label })),
        ...parsed.outputs.map((out, i) => ({ key: `output_${i}`, header: out.label })),
      ]
    : [];

  const dmnTableRows = parsed
    ? parsed.rules.map((rule, ri) => {
        const row: any = { id: String(ri) };
        rule.inputs.forEach((val, i) => { row[`input_${i}`] = val || '—'; });
        rule.outputs.forEach((val, i) => { row[`output_${i}`] = val || '—'; });
        return row;
      })
    : [];

  return (
    <>
      <PageHeader
        title={defName || '의사결정 정의'}
        description={
          <span style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn')}>Dashboard</span>
            {' > '}
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn/decisions')}>Decisions</span>
            {' > '}
            <span style={{ color: 'var(--cds-text-primary)' }}>{defName}</span>
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
            <MetaItem label="Definition ID" value={decision?.id} />
            <MetaItem label="Definition Key" value={decision?.key} />
            <MetaItem label="Definition Name" value={decision?.name} />
            <MetaItem label="Version" value={decision?.version} />
            <MetaItem label="Version Tag" value={decision?.versionTag} />
            <MetaItem label="Tenant ID" value={decision?.tenantId} />
            <MetaItem label="Deployment ID" value={decision?.deploymentId} />
            <MetaItem label="History Time To Live" value={decision?.historyTimeToLive} />
          </div>

          {/* Main */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* DMN Table Viewer */}
            <div style={{ background: '#fff', padding: '1.25rem', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
                DMN 결정 테이블
              </div>
              {!dmnXml ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fafafa', border: '1px solid #e0e0e0' }}>
                  DMN XML을 불러올 수 없습니다.
                </div>
              ) : parsed && dmnTableHeaders.length > 0 ? (
                <DataTable rows={dmnTableRows} headers={dmnTableHeaders}>
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
                        {rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={headers.length}>
                              <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>규칙이 없습니다.</span>
                            </TableCell>
                          </TableRow>
                        ) : (
                          rows.map(row => (
                            <TableRow key={row.id} {...getRowProps({ row })}>
                              {row.cells.map(cell => (
                                <TableCell key={cell.id}>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{cell.value}</span>
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              ) : (
                <pre style={{ fontSize: '0.75rem', background: '#f4f4f4', padding: '1rem', overflowX: 'auto', border: '1px solid #e0e0e0', margin: 0 }}>
                  {dmnXml}
                </pre>
              )}
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff' }}>
              <Tabs>
                <TabList contained aria-label="Decision detail tabs">
                  <Tab>Decision Instances ({history.length})</Tab>
                  <Tab>Info</Tab>
                </TabList>
                <TabPanels>
                  {/* Decision Instances */}
                  <TabPanel>
                    <div style={{ padding: '1rem' }}>
                      {historyRows.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                          평가 이력이 없습니다.
                        </div>
                      ) : (
                        <DataTable rows={historyRows} headers={instanceHeaders}>
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
                                      <TableCell key={cell.id}>
                                        {cell.info.header === 'instanceId' ? (
                                          <span style={{ color: '#0f62fe', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{cell.value}</span>
                                        ) : (
                                          cell.value
                                        )}
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
                  </TabPanel>

                  {/* Info */}
                  <TabPanel>
                    <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem' }}>
                      <MetaItem label="Definition ID" value={decision?.id} />
                      <MetaItem label="Definition Key" value={decision?.key} />
                      <MetaItem label="Definition Name" value={decision?.name} />
                      <MetaItem label="Version" value={decision?.version} />
                      <MetaItem label="Version Tag" value={decision?.versionTag} />
                      <MetaItem label="Tenant ID" value={decision?.tenantId} />
                      <MetaItem label="Deployment ID" value={decision?.deploymentId} />
                      <MetaItem label="History Time To Live" value={decision?.historyTimeToLive} />
                      <MetaItem label="Resource" value={decision?.resource} />
                      <MetaItem label="Category" value={decision?.category} />
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
