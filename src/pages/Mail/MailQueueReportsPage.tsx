
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
  InlineLoading,
  Pagination,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Modal,
} from '@carbon/react';
import { Renew, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, fmtDateShort, fmtBytes, type QueueReport } from '../../api/mail';

const REPORT_TYPES = [
  { key: 'dmarc', label: 'DMARC' },
  { key: 'tls', label: 'TLS-RPT' },
];

// ── 리포트 테이블 ─────────────────────────────────────────────────────────

function ReportTable({ reportType }: { reportType: string }) {
  const [items, setItems] = useState<QueueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<QueueReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listQueueReports({ type: reportType, limit: pageSize, page });
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [reportType, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try { await mailApi.deleteQueueReport(deleteTarget.id); await load(); } catch { /* ignore */ }
    setDeleteTarget(null);
  };

  const headers = [
    { key: 'domain', header: '도메인' },
    { key: 'policyDomain', header: '정책 도메인' },
    { key: 'recipients', header: '수신자' },
    { key: 'nextDelivery', header: '다음 전송' },
    { key: 'size', header: '크기' },
  ];

  const rows = items.map((r, i) => ({
    id: r.id ?? String(i),
    domain: r.domain ?? '—',
    policyDomain: r.policy_domain ?? '—',
    recipients: (r.recipients ?? []).join(', ') || '—',
    nextDelivery: fmtDateShort(r.next_delivery ?? r.next_report),
    size: fmtBytes(r.size),
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
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={dtHeaders.length + 1}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={dtHeaders.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>
                    발신 대기 중인 {reportType.toUpperCase()} 리포트가 없습니다
                  </TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items.find((r) => (r.id ?? '') === row.id || items.indexOf(r) === dtRows.indexOf(row));
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{
                          fontFamily: cell.info.header === 'domain' || cell.info.header === 'policyDomain' ? 'monospace' : undefined,
                          fontSize: 13,
                          whiteSpace: cell.info.header === 'nextDelivery' ? 'nowrap' : undefined,
                        }}>
                          {cell.info.header === 'size' ? (
                            <Tag type="gray">{String(cell.value)}</Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button kind="danger--ghost" renderIcon={TrashCan} hasIconOnly iconDescription="삭제"
                          onClick={() => orig && setDeleteTarget(orig)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>

      {total > pageSize && (
        <Pagination
          totalItems={total}
          pageSize={pageSize}
          page={page}
          pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
        />
      )}
      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>총 {total}건</div>

      <Modal
        open={deleteTarget !== null}
        onRequestClose={() => setDeleteTarget(null)}
        modalHeading="리포트 삭제"
        primaryButtonText="삭제"
        secondaryButtonText="취소"
        danger
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setDeleteTarget(null)}
        size="xs"
      >
        <p><strong>{deleteTarget?.domain}</strong> 리포트를 큐에서 삭제하시겠습니까?</p>
      </Modal>
    </>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailQueueReportsPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <PageHeader
        title="발신 리포트 큐"
        description="DMARC 및 TLS-RPT 발신 대기 리포트 관리"
      />

      <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => setSelectedTab(selectedIndex)}>
        <TabList contained aria-label="리포트 유형">
          {REPORT_TYPES.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {REPORT_TYPES.map((t) => (
            <TabPanel key={t.key}>
              <ReportTable reportType={t.key} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </>
  );
}
