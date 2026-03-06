// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import {
  Button,
  Select,
  SelectItem,
  Tag,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
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
import { ArrowLeft, Launch } from '@carbon/icons-react';

interface Build {
  id: string;
  status: string;
  branch?: string;
  commit?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  triggeredBy?: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: string;
  method?: string;
  repoUrl?: string;
  branch?: string;
}

function fmtDate(ts?: string) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function BuildStatusTag({ status }: { status: string }) {
  const map: Record<string, { type: string; label: string }> = {
    success:   { type: 'green',     label: '성공' },
    failed:    { type: 'red',       label: '실패' },
    running:   { type: 'blue',      label: '실행 중' },
    pending:   { type: 'warm-gray', label: '대기 중' },
    cancelled: { type: 'gray',      label: '취소됨' },
  };
  const s = map[status] || { type: 'gray', label: status || '—' };
  return <Tag type={s.type as any}>{s.label}</Tag>;
}

export default function HomepageBuildPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const siteId   = (location.state as any)?.siteId;

  const [sites,        setSites]        = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [builds,       setBuilds]       = useState<Build[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [building,     setBuilding]     = useState(false);

  const loadSites = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/sites');
      if (res.ok) {
        const d = await res.json();
        const list: Site[] = Array.isArray(d) ? d : (d.data || []);
        setSites(list);
        if (siteId) {
          setSelectedSite(list.find(s => s.id === siteId) || list[0] || null);
        } else {
          setSelectedSite(list[0] || null);
        }
      }
    } catch { /* ignore */ }
  }, [siteId]);

  const loadBuilds = useCallback(async (site: Site | null) => {
    if (!site) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/sites/${site.id}/builds`);
      if (res.ok) {
        const d = await res.json();
        setBuilds(d.builds || d || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSites().then(() => setLoading(false));
  }, [loadSites]);

  useEffect(() => {
    if (selectedSite) loadBuilds(selectedSite);
  }, [selectedSite, loadBuilds]);

  const triggerBuild = async () => {
    if (!selectedSite) return;
    setBuilding(true);
    try {
      await fetch(`/api/v1/sites/${selectedSite.id}/build`, { method: 'POST' });
      setTimeout(() => loadBuilds(selectedSite), 1500);
    } catch { /* ignore */ }
    setBuilding(false);
  };

  // Build history DataTable
  const buildHeaders = [
    { key: 'status',      header: '상태' },
    { key: 'branch',      header: '브랜치' },
    { key: 'commit',      header: '커밋' },
    { key: 'startedAt',   header: '시작 시간' },
    { key: 'duration',    header: '소요 시간' },
    { key: 'triggeredBy', header: '트리거' },
  ];
  const buildRows = builds.map((b, i) => ({
    id:          b.id || String(i),
    status:      b.status,
    branch:      b.branch || '—',
    commit:      b.commit ? b.commit.slice(0, 7) : '—',
    startedAt:   fmtDate(b.startedAt),
    duration:    b.duration ? `${Math.round(b.duration)}s` : '—',
    triggeredBy: b.triggeredBy || 'manual',
  }));

  // Site settings StructuredList rows
  const siteFields = selectedSite
    ? [
        { key: '이름',   value: selectedSite.name },
        { key: '슬러그', value: selectedSite.slug },
        { key: '도메인', value: selectedSite.domain || `${selectedSite.slug}.polyon.local` },
        { key: '방식',   value: selectedSite.method || '—' },
        { key: 'Git URL',value: selectedSite.repoUrl || '—' },
        { key: '브랜치', value: selectedSite.branch || 'main' },
        { key: '상태',   value: selectedSite.status },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="빌드 관리"
        description="사이트 빌드 이력 및 배포 상태를 관리합니다."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button
              kind="ghost"
             
              renderIcon={ArrowLeft}
              onClick={() => navigate('/homepage/sites')}
            >
              사이트 목록
            </Button>
            {selectedSite && (
              <Button
                kind="primary"
               
                renderIcon={Launch}
                onClick={triggerBuild}
                disabled={building}
              >
                {building ? '배포 중...' : '빌드 & 배포'}
              </Button>
            )}
          </div>
        }
      />

      {/* Site selector */}
      {sites.length > 1 && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <Select
            id="site-select"
            labelText="사이트"
            value={selectedSite?.id || ''}
            onChange={e => setSelectedSite(sites.find(s => s.id === e.target.value) || null)}
            style={{ width: 280 }}
          >
            {sites.map(s => <SelectItem key={s.id} value={s.id} text={s.name} />)}
          </Select>
        </div>
      )}

      {/* Site info */}
      {selectedSite && (
        <div style={{ marginTop: '1rem', background: '#f4f4f4', padding: '0.75rem 1rem', display: 'flex', gap: '2rem', fontSize: '0.8125rem' }}>
          <span><strong>상태:</strong> {selectedSite.status}</span>
          <span><strong>방식:</strong> {selectedSite.method || '—'}</span>
          {selectedSite.domain && <span><strong>도메인:</strong> {selectedSite.domain}</span>}
          {selectedSite.branch && <span><strong>브랜치:</strong> {selectedSite.branch}</span>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginTop: '1rem' }}>
        <Tabs>
          <TabList contained aria-label="빌드 관리 탭">
            <Tab>빌드 이력</Tab>
            <Tab>설정</Tab>
          </TabList>
          <TabPanels>
            {/* 빌드 이력 패널 */}
            <TabPanel>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
              ) : builds.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0' }}>
                  빌드 이력이 없습니다.
                </div>
              ) : (
                <DataTable rows={buildRows} headers={buildHeaders}>
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
                            {row.cells.map(cell => {
                              if (cell.info.header === 'status') {
                                return (
                                  <TableCell key={cell.id}>
                                    <BuildStatusTag status={cell.value} />
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'branch' || cell.info.header === 'commit') {
                                return (
                                  <TableCell key={cell.id}>
                                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
                                      {cell.value}
                                    </span>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'triggeredBy') {
                                return (
                                  <TableCell key={cell.id}>
                                    <span style={{ color: 'var(--cds-text-secondary)' }}>{cell.value}</span>
                                  </TableCell>
                                );
                              }
                              return <TableCell key={cell.id}>{cell.value}</TableCell>;
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              )}
            </TabPanel>

            {/* 설정 패널 */}
            <TabPanel>
              {selectedSite && (
                <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '1.5rem', maxWidth: 520 }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>사이트 설정</h4>
                  <StructuredListWrapper>
                    <StructuredListBody>
                      {siteFields.map(({ key, value }) => (
                        <StructuredListRow key={key}>
                          <StructuredListCell>
                            <span style={{ fontWeight: 600, color: 'var(--cds-text-secondary)', minWidth: 120, display: 'inline-block' }}>
                              {key}
                            </span>
                          </StructuredListCell>
                          <StructuredListCell>
                            <span style={{
                              fontFamily: key === 'Git URL' || key === '슬러그' ? "'IBM Plex Mono', monospace" : 'inherit',
                              fontSize:   key === 'Git URL' ? '0.75rem' : 'inherit',
                            }}>
                              {value}
                            </span>
                          </StructuredListCell>
                        </StructuredListRow>
                      ))}
                    </StructuredListBody>
                  </StructuredListWrapper>
                </div>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
}
