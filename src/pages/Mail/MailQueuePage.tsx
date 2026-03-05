
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
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  InlineLoading,
  Modal,
  Pagination,
} from '@carbon/react';
import { Renew, TrashCan, Restart } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import {
  mailApi,
  fmtDateShort,
  fmtBytes,
  fmtDate,
  statusTagClass,
  statusTagLabel,
  type QueueMessage,
  type QueueRecipient,
} from '../../api/mail';

// ── 수신자 상태 표시 ──────────────────────────────────────────────────────

function RecipientStatusTag({ status }: { status?: QueueRecipient['status'] }) {
  const cls = statusTagClass(status);
  const label = statusTagLabel(status);
  const typeMap: Record<string, 'blue' | 'green' | 'purple' | 'red' | 'gray'> = {
    blue: 'blue', green: 'green', purple: 'purple', red: 'red', gray: 'gray',
  };
  return <Tag type={typeMap[cls] ?? 'gray'} size="sm">{label}</Tag>;
}

// ── 메시지 상세 패널 ──────────────────────────────────────────────────────

function MessageDetailModal({
  messageId,
  open,
  onClose,
  onRetry,
  onDelete,
}: {
  messageId: number | null;
  open: boolean;
  onClose: () => void;
  onRetry: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [msg, setMsg] = useState<QueueMessage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !messageId) return;
    setLoading(true);
    mailApi.getQueueMessage(messageId)
      .then((r) => setMsg(r.data ?? null))
      .catch(() => setMsg(null))
      .finally(() => setLoading(false));
  }, [open, messageId]);

  const recipients = msg?.recipients ?? [];

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={messageId ? `메시지 #${messageId}` : '메시지 상세'}
      passiveModal
      size="lg"
    >
      {loading ? (
        <InlineLoading description="로딩 중…" />
      ) : !msg ? (
        <p style={{ color: 'var(--cds-support-error)' }}>메시지를 불러올 수 없습니다.</p>
      ) : (
        <div>
          {/* 기본 정보 */}
          <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)', letterSpacing: '0.32px', marginBottom: 8, textTransform: 'uppercase' }}>기본 정보</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 0', marginBottom: 16, fontSize: 13 }}>
            {[
              ['ID', msg.id],
              ['발신자', msg.return_path ?? 'Mailer Daemon'],
              ['크기', fmtBytes(msg.size)],
              ['우선순위', msg.priority ?? '—'],
              ['생성', fmtDate(msg.created)],
              ['Envelope ID', msg.env_id ?? '—'],
              ['Blob Hash', msg.blob_hash ?? '—'],
            ].map(([k, v]) => (
              <>
                <span key={`k-${k}`} style={{ fontWeight: 600, color: 'var(--cds-text-secondary)' }}>{k}</span>
                <span key={`v-${k}`} style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{String(v)}</span>
              </>
            ))}
          </div>

          {/* 수신자 */}
          <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)', letterSpacing: '0.32px', marginBottom: 8, textTransform: 'uppercase' }}>
            수신자 ({recipients.length})
          </h4>
          <div style={{ marginBottom: 16 }}><Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>주소</TableHeader>
                <TableHeader style={{ width: 120 }}>상태</TableHeader>
                <TableHeader style={{ width: 80 }}>큐</TableHeader>
                <TableHeader style={{ width: 60 }}>재시도</TableHeader>
                <TableHeader style={{ width: 140 }}>다음 재시도</TableHeader>
                <TableHeader style={{ width: 140 }}>만료</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipients.map((r, i) => (
                <TableRow key={i}>
                  <TableCell style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.address}</TableCell>
                  <TableCell><RecipientStatusTag status={r.status} /></TableCell>
                  <TableCell style={{ fontSize: 12 }}>{r.queue ?? '—'}</TableCell>
                  <TableCell>{r.retry_num ?? 0}</TableCell>
                  <TableCell style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateShort(r.next_retry)}</TableCell>
                  <TableCell style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateShort(r.expires)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" size="sm" renderIcon={Restart} onClick={() => { onRetry(msg.id); onClose(); }}>재시도</Button>
            <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => { onDelete(msg.id); onClose(); }}>취소/삭제</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailQueuePage() {
  const [items, setItems] = useState<QueueMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof mailApi.listQueue>[0] = { page, limit: pageSize };
      if (query) params.text = query;
      const r = await mailApi.listQueue(params);
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
      setSelectedIds(new Set());
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, pageSize, query]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (id: number) => {
    try { await mailApi.retryQueueMessage(id); await load(); } catch { /* ignore */ }
  };
  const handleDelete = async (id: number) => {
    try { await mailApi.cancelQueueMessage(id); await load(); } catch { /* ignore */ }
  };
  const handleBulkDelete = async () => {
    for (const id of selectedIds) await mailApi.cancelQueueMessage(id).catch(() => null);
    await load();
  };
  const handleBulkRetry = async () => {
    for (const id of selectedIds) await mailApi.retryQueueMessage(id).catch(() => null);
    await load();
  };

  const getNextRetry = (recipients: QueueRecipient[]): string | undefined => {
    const dates = recipients.map((r) => r.next_retry).filter(Boolean) as string[];
    return dates.length ? dates.sort()[0] : undefined;
  };
  const getExpires = (recipients: QueueRecipient[]): string | undefined => {
    const dates = recipients.map((r) => r.expires).filter(Boolean) as string[];
    return dates.length ? dates.sort()[0] : undefined;
  };

  const headers = [
    { key: 'id', header: 'ID' },
    { key: 'from', header: '발신자' },
    { key: 'recipients', header: '수신자' },
    { key: 'size', header: '크기' },
    { key: 'created', header: '생성' },
    { key: 'next_retry', header: '다음 재시도' },
    { key: 'expires', header: '만료' },
  ];

  const rows = items.map((m) => {
    const rcpts = m.recipients ?? [];
    const rcptAddrs = rcpts.map((r) => r.address).join(', ');
    return {
      id: String(m.id),
      _id: m.id,
      id_display: String(m.id),
      from: m.return_path ?? 'Mailer Daemon',
      recipients: rcptAddrs || '—',
      _recipients: rcpts,
      size: fmtBytes(m.size),
      created: fmtDateShort(m.created),
      next_retry: fmtDateShort(getNextRetry(rcpts)),
      expires: fmtDateShort(getExpires(rcpts)),
    };
  });

  return (
    <>
      <PageHeader title="메일 큐" description="SMTP 발송 큐 — 메시지 관리, 재시도, 취소" />

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button kind="ghost" size="sm" renderIcon={Restart} onClick={handleBulkRetry}>
            재시도 ({selectedIds.size})
          </Button>
          <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={handleBulkDelete}>
            삭제 ({selectedIds.size})
          </Button>
        </div>
      )}

      <DataTable rows={rows} headers={headers} size="sm">
        {({
          rows: dtRows,
          headers: dtHeaders,
          getTableProps,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getToolbarProps,
          getBatchActionProps,
          selectedRows,
          onInputChange,
          getTableContainerProps,
        }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e);
                    setQuery(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                    setPage(1);
                  }}
                  placeholder="발신자/수신자 검색…"
                  persistent
                />
                <Button
                  kind="ghost"
                  renderIcon={Renew}
                  iconDescription="새로고침"
                  hasIconOnly
                  onClick={load}
                  tooltipPosition="bottom"
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableSelectAll {...getSelectionProps()} />
                  {dtHeaders.map((h) => (
                    <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                  ))}
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={dtHeaders.length + 2}>
                      <InlineLoading description="로딩 중…" />
                    </TableCell>
                  </TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dtHeaders.length + 2} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>
                      큐가 비어 있습니다
                    </TableCell>
                  </TableRow>
                ) : dtRows.map((row) => {
                  const orig = items.find((m) => String(m.id) === row.id);
                  const rcpts = orig?.recipients ?? [];
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      <TableSelectRow {...getSelectionProps({ row })} onChange={(checked: boolean) => {
                        const id = orig?.id;
                        if (!id) return;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(id); else next.delete(id);
                          return next;
                        });
                      }} />
                      {row.cells.map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{
                            fontFamily: ['id', 'from'].includes(cell.info.header) ? 'monospace' : undefined,
                            fontSize: 12,
                            cursor: cell.info.header === 'id' ? 'pointer' : undefined,
                            whiteSpace: ['created', 'next_retry', 'expires'].includes(cell.info.header) ? 'nowrap' : undefined,
                          }}
                          onClick={cell.info.header === 'id' ? () => setDetailId(orig?.id ?? null) : undefined}
                        >
                          {cell.info.header === 'recipients' && rcpts.length > 0 ? (
                            <div>
                              {rcpts.slice(0, 2).map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.address}</span>
                                  <RecipientStatusTag status={r.status} />
                                </div>
                              ))}
                              {rcpts.length > 2 && <span style={{ fontSize: 11, color: 'var(--cds-text-secondary)' }}>+{rcpts.length - 2}</span>}
                            </div>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button kind="ghost" size="sm" renderIcon={Restart} hasIconOnly iconDescription="재시도"
                            onClick={() => orig && handleRetry(orig.id)} />
                          <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} hasIconOnly iconDescription="삭제"
                            onClick={() => orig && handleDelete(orig.id)} />
                        </div>
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

      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>
        총 {total}건
      </div>

      <MessageDetailModal
        messageId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        onRetry={handleRetry}
        onDelete={handleDelete}
      />
    </>
  );
}
