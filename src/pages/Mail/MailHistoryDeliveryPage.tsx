
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
  TableToolbarSearch,
  Tag,
  InlineLoading,
  Pagination,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

interface DeliveryHistoryItem {
  id?: string;
  timestamp?: string;
  from?: string;
  to?: string | string[];
  status?: string;
  queueId?: string;
  queue_id?: string;
  reason?: string;
}

function fmtDateShort(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_TAG: Record<string, { type: string; label: string }> = {
  delivered: { type: 'green', label: '발송 완료' },
  failed: { type: 'red', label: '발송 실패' },
  deferred: { type: 'purple', label: '지연' },
  bounced: { type: 'orange', label: '반송' },
  completed: { type: 'green', label: '완료' },
  temp_fail: { type: 'yellow', label: '일시 실패' },
  perm_fail: { type: 'red', label: '영구 실패' },
};

export default function MailHistoryDeliveryPage() {
  const [items, setItems] = useState<DeliveryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filterText, setFilterText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'delivery',
        page: String(page),
        limit: String(pageSize),
      });
      if (filterText) params.set('q', filterText);
      const res = await fetch(`/api/v1/mail/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? data.messages ?? []);
        setTotal(data.total ?? (data.items ?? data.messages ?? []).length);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize, filterText]);

  useEffect(() => { load(); }, [load]);

  const headers = [
    { key: 'timestamp', header: '시간' },
    { key: 'from', header: '발신자' },
    { key: 'to', header: '수신자' },
    { key: 'status', header: '상태' },
    { key: 'queueId', header: 'Queue ID' },
  ];

  const rows = items.map((item, i) => ({
    id: item.id ?? String(i),
    timestamp: fmtDateShort(item.timestamp),
    from: item.from ?? '—',
    to: Array.isArray(item.to) ? item.to.join(', ') : (item.to ?? '—'),
    status: item.status ?? '—',
    queueId: item.queueId ?? item.queue_id ?? '—',
  }));

  return (
    <>
      <PageHeader title="발송 시도 이력" description="SMTP 발송 시도 이력 조회 및 검색" />

      <DataTable rows={rows} headers={headers} size="sm">
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps, onInputChange }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e);
                    setFilterText(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                    setPage(1);
                  }}
                  placeholder="발신자/수신자/Queue ID 검색…"
                  persistent
                />
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
                  <TableRow>
                    <TableCell colSpan={dtHeaders.length} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>
                      발송 시도 이력이 없습니다
                    </TableCell>
                  </TableRow>
                ) : dtRows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => {
                      const statusInfo = STATUS_TAG[String(cell.value).toLowerCase()];
                      return (
                        <TableCell key={cell.id} style={{
                          fontFamily: ['from', 'to', 'queueId'].includes(cell.info.header) ? 'monospace' : undefined,
                          fontSize: 12,
                          whiteSpace: cell.info.header === 'timestamp' ? 'nowrap' : undefined,
                        }}>
                          {cell.info.header === 'status' ? (
                            <Tag type={(statusInfo?.type ?? 'gray') as 'gray'} size="sm">
                              {statusInfo?.label ?? String(cell.value)}
                            </Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
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
    </>
  );
}
