
import { useEffect, useState, useCallback } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  Tag,
  Modal,
  InlineLoading,
  Pagination,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  CodeSnippet,
} from '@carbon/react';
import { Renew, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, fmtDate, type ReceivedReport } from '../../api/mail';

const REPORT_TABS = [
  { key: 'dmarc', label: 'DMARC' },
  { key: 'tls', label: 'TLS-RPT' },
  { key: 'arf', label: 'ARF' },
];

// ── 리포트 상세 모달 ──────────────────────────────────────────────────────

function ReportDetailModal({
  open,
  report,
  reportType,
  onClose,
  onDeleted,
}: {
  open: boolean;
  report: ReceivedReport | null;
  reportType: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!report?.id) return;
    setDeleting(true);
    try { await mailApi.deleteReceivedReport(reportType, report.id); onDeleted(); onClose(); } catch { /* ignore */ }
    setDeleting(false);
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={`리포트 상세 — ${report?.from ?? ''}`}
      passiveModal={false}
      primaryButtonText={deleting ? '삭제 중…' : '삭제'}
      secondaryButtonText="닫기"
      danger
      onRequestSubmit={handleDelete}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={deleting}
      size="lg"
    >
      {report && (
        <CodeSnippet type="multi" wrapText>
          {JSON.stringify(report.report ?? report, null, 2)}
        </CodeSnippet>
      )}
    </Modal>
  );
}

// ── DMARC 리포트 테이블 ───────────────────────────────────────────────────

function DmarcReportTable({ onSelect }: { onSelect: (r: ReceivedReport) => void }) {
  const [items, setItems] = useState<ReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listReceivedReports('dmarc', { page, limit: pageSize });
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const headers = [
    { key: 'from', header: '보고기관' },
    { key: 'domains', header: '도메인' },
    { key: 'range', header: '기간' },
    { key: 'pass', header: 'Pass' },
    { key: 'reject', header: 'Reject' },
    { key: 'quarantine', header: 'Quarantine' },
    { key: 'received', header: '수신일' },
  ];

  const rows = items.map((r, i) => ({
    id: r.id ?? String(i),
    from: r.from ?? '—',
    domains: (r.domains ?? []).join(', ') || '—',
    range: r.range_from && r.range_to ? `${fmtDate(r.range_from)} ~ ${fmtDate(r.range_to)}` : '—',
    pass: r.total_passes ?? 0,
    reject: r.total_rejects ?? 0,
    quarantine: r.total_quarantined ?? 0,
    received: fmtDate(r.received),
    _orig: r,
  }));

  return (
    <>
      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={dtHeaders.length}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={dtHeaders.length} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>수신된 DMARC 리포트가 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items[dtRows.indexOf(row)];
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id} style={{ cursor: 'pointer' }}
                      onClick={() => orig && onSelect(orig)}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {cell.info.header === 'pass' ? (
                            <Tag type="green">{cell.value}</Tag>
                          ) : cell.info.header === 'reject' ? (
                            <Tag type="red">{cell.value}</Tag>
                          ) : cell.info.header === 'quarantine' ? (
                            <Tag type="purple">{cell.value}</Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>
      {total > pageSize && (
        <Pagination totalItems={total} pageSize={pageSize} page={page} pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }} />
      )}
      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>총 {total}건 (행 클릭 시 상세 보기)</div>
    </>
  );
}

// ── TLS 리포트 테이블 ─────────────────────────────────────────────────────

function TlsReportTable({ onSelect }: { onSelect: (r: ReceivedReport) => void }) {
  const [items, setItems] = useState<ReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listReceivedReports('tls', { page, limit: pageSize });
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const headers = [
    { key: 'from', header: '보고기관' },
    { key: 'domains', header: '도메인' },
    { key: 'range', header: '기간' },
    { key: 'success', header: '성공' },
    { key: 'failures', header: '실패' },
    { key: 'received', header: '수신일' },
  ];

  const rows = items.map((r, i) => ({
    id: r.id ?? String(i),
    from: r.from ?? '—',
    domains: (r.domains ?? []).join(', ') || '—',
    range: r.range_from && r.range_to ? `${fmtDate(r.range_from)} ~ ${fmtDate(r.range_to)}` : '—',
    success: r.total_success ?? 0,
    failures: r.total_failures ?? 0,
    received: fmtDate(r.received),
  }));

  return (
    <>
      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={dtHeaders.length}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={dtHeaders.length} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>수신된 TLS-RPT 리포트가 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items[dtRows.indexOf(row)];
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id} style={{ cursor: 'pointer' }}
                      onClick={() => orig && onSelect(orig)}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {cell.info.header === 'success' ? (
                            <Tag type="green">{cell.value}</Tag>
                          ) : cell.info.header === 'failures' ? (
                            <Tag type="red">{cell.value}</Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>
      {total > pageSize && (
        <Pagination totalItems={total} pageSize={pageSize} page={page} pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }} />
      )}
      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>총 {total}건</div>
    </>
  );
}

// ── ARF 리포트 테이블 ─────────────────────────────────────────────────────

function ArfReportTable({ onSelect }: { onSelect: (r: ReceivedReport) => void }) {
  const [items, setItems] = useState<ReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listReceivedReports('arf', { page, limit: pageSize });
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const headers = [
    { key: 'from', header: '보고자' },
    { key: 'domains', header: '도메인' },
    { key: 'feedbackType', header: '유형' },
    { key: 'incidents', header: '건수' },
    { key: 'arrivalDate', header: '도착일' },
    { key: 'received', header: '수신일' },
  ];

  const rows = items.map((r, i) => ({
    id: r.id ?? String(i),
    from: r.from ?? '—',
    domains: (r.domains ?? []).join(', ') || '—',
    feedbackType: r.feedback_type ?? r.typ ?? '—',
    incidents: r.total_incidents ?? 0,
    arrivalDate: fmtDate(r.arrival_date),
    received: fmtDate(r.received),
  }));

  return (
    <>
      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={dtHeaders.length}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={dtHeaders.length} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>수신된 ARF 리포트가 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items[dtRows.indexOf(row)];
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id} style={{ cursor: 'pointer' }}
                      onClick={() => orig && onSelect(orig)}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {cell.info.header === 'feedbackType' ? (
                            <Tag type="red">{String(cell.value)}</Tag>
                          ) : cell.info.header === 'incidents' ? (
                            <Tag type="warm-gray">{cell.value}건</Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>
      {total > pageSize && (
        <Pagination totalItems={total} pageSize={pageSize} page={page} pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }} />
      )}
      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>총 {total}건</div>
    </>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailReportsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ReceivedReport | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const currentType = REPORT_TABS[selectedTab]?.key ?? 'dmarc';

  return (
    <>
      <PageHeader title="수신 리포트" description="DMARC · TLS-RPT · ARF 피드백 리포트 조회" />

      <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => setSelectedTab(selectedIndex)}>
        <TabList contained aria-label="리포트 유형">
          {REPORT_TABS.map((t) => <Tab key={t.key}>{t.label}</Tab>)}
        </TabList>
        <TabPanels>
          <TabPanel>
            <DmarcReportTable key={`dmarc-${reloadKey}`} onSelect={(r) => setSelectedReport({ ...r, _reportType: 'dmarc' } as any)} />
          </TabPanel>
          <TabPanel>
            <TlsReportTable key={`tls-${reloadKey}`} onSelect={(r) => setSelectedReport({ ...r, _reportType: 'tls' } as any)} />
          </TabPanel>
          <TabPanel>
            <ArfReportTable key={`arf-${reloadKey}`} onSelect={(r) => setSelectedReport({ ...r, _reportType: 'arf' } as any)} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <ReportDetailModal
        open={selectedReport !== null}
        report={selectedReport}
        reportType={(selectedReport as any)?._reportType ?? currentType}
        onClose={() => setSelectedReport(null)}
        onDeleted={() => { setSelectedReport(null); setReloadKey((k) => k + 1); }}
      />
    </>
  );
}
