
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

interface ReceivedHistoryItem {
  id?: string;
  timestamp?: string;
  from?: string;
  to?: string | string[];
  status?: string;
  size?: number;
  messageId?: string;
}

function fmtBytes(b?: number): string {
  if (!b || b === 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fmtDateShort(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_TAG: Record<string, string> = {
  delivered: 'green',
  rejected: 'red',
  deferred: 'purple',
  bounced: 'orange',
  spam: 'yellow',
};

export default function MailHistoryReceivedPage() {
  const [items, setItems] = useState<ReceivedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filterText, setFilterText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'received',
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
    { key: 'size', header: '크기' },
    { key: 'messageId', header: 'Message-ID' },
  ];

  const rows = items.map((item, i) => ({
    id: item.id ?? String(i),
    timestamp: fmtDateShort(item.timestamp),
    from: item.from ?? '—',
    to: Array.isArray(item.to) ? item.to.join(', ') : (item.to ?? '—'),
    status: item.status ?? '—',
    size: fmtBytes(item.size),
    messageId: item.messageId ?? '—',
  }));

  return (
    <>
      <PageHeader title="수신 메시지 이력" description="수신된 이메일 이력 조회 및 검색" />

      <DataTable rows={rows} headers={headers}>
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
                  placeholder="발신자/수신자/Message-ID 검색…"
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
                      수신 이력이 없습니다
                    </TableCell>
                  </TableRow>
                ) : dtRows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id} style={{
                        fontFamily: ['from', 'to', 'messageId'].includes(cell.info.header) ? 'monospace' : undefined,
                        fontSize: 12,
                        whiteSpace: cell.info.header === 'timestamp' ? 'nowrap' : undefined,
                        maxWidth: cell.info.header === 'messageId' ? 200 : undefined,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {cell.info.header === 'status' ? (
                          <Tag type={(STATUS_TAG[String(cell.value).toLowerCase()] ?? 'gray') as 'gray'}>
                            {String(cell.value)}
                          </Tag>
                        ) : String(cell.value)}
                      </TableCell>
                    ))}
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
