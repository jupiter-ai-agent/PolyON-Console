// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
  InlineNotification,
  SkeletonText,
  Modal,
  Tile,
  InlineLoading,
} from '@carbon/react';
import { Add, RecentlyViewed } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  { key: 'date', header: '날짜' },
  { key: 'author', header: '작성자' },
  { key: 'message', header: '변경 내용' },
  { key: 'sha', header: 'SHA' },
];

const PAGE_SIZE = 20;

// ── Diff Renderer ─────────────────────────────────────────────────────────────

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n');
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        background: 'var(--cds-layer-01)',
        padding: '16px',
        borderRadius: '4px',
        maxHeight: '480px',
        overflowY: 'auto',
      }}
    >
      {lines.map((line, i) => {
        let color = 'inherit';
        if (line.startsWith('+') && !line.startsWith('+++')) color = 'var(--cds-support-success)';
        else if (line.startsWith('-') && !line.startsWith('---')) color = 'var(--cds-support-error)';
        else if (line.startsWith('@@')) color = 'var(--cds-support-info)';
        return (
          <span key={i} style={{ color, display: 'block' }}>
            {line || ' '}
          </span>
        );
      })}
    </pre>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsConfigHistoryPage() {
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Diff modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  const [diff, setDiff] = useState<string>('');
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Track config
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getConfigHistory(200);
      const items = Array.isArray(data) ? data : data?.data ?? [];
      setCommits(items);
    } catch (e: any) {
      setError('설정 이력을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRowClick = async (commit: any) => {
    setSelectedCommit(commit);
    setDiff('');
    setDiffError(null);
    setModalOpen(true);
    setDiffLoading(true);
    try {
      const data = await settingsApi.getConfigDiff(commit.sha);
      setDiff(data?.diff ?? '(diff 없음)');
    } catch {
      setDiffError('diff를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDiffLoading(false);
    }
  };

  const handleTrack = async () => {
    setTracking(true);
    setTrackMsg(null);
    try {
      await settingsApi.trackConfig();
      setTrackMsg({ kind: 'success', msg: '현재 설정이 스냅샷되었습니다.' });
      await loadHistory();
    } catch {
      setTrackMsg({ kind: 'error', msg: '스냅샷 생성에 실패했습니다.' });
    } finally {
      setTracking(false);
    }
  };

  // Pagination
  const paged = commits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tableRows = paged.map((c, idx) => ({
    id: c.sha ?? String(idx),
    date: c.commit?.author?.date
      ? new Date(c.commit.author.date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      : c.created
      ? new Date(c.created).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      : '-',
    author: c.commit?.author?.name ?? '-',
    message: c.message ?? c.commit?.message ?? '-',
    sha: (c.sha ?? '').slice(0, 7),
    _raw: c,
  }));

  return (
    <div style={{ padding: '32px' }}>
      <PageHeader
        title="설정 변경 이력"
        description="PolyON 설정 변경 사항을 Git으로 추적합니다"
      />

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <Button
          kind="primary"
          size="md"
          renderIcon={Add}
          onClick={handleTrack}
          disabled={tracking}
        >
          {tracking ? '스냅샷 생성 중...' : '현재 설정 스냅샷'}
        </Button>

        {trackMsg && (
          <InlineNotification
            kind={trackMsg.kind}
            title={trackMsg.kind === 'success' ? '완료' : '오류'}
            subtitle={trackMsg.msg}
            hideCloseButton={false}
            onCloseButtonClick={() => setTrackMsg(null)}
            style={{ maxWidth: '400px' }}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification kind="error" title="오류" subtitle={error} hideCloseButton />
        </div>
      )}

      {/* Table */}
      <Tile style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px' }}>
            <SkeletonText paragraph lineCount={6} />
          </div>
        ) : (
          <DataTable rows={tableRows} headers={TABLE_HEADERS}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer title="">
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={TABLE_HEADERS.length}
                          style={{ textAlign: 'center', color: 'var(--cds-text-secondary)', padding: '32px' }}
                        >
                          설정 변경 이력이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const raw = tableRows.find((r) => r.id === row.id)?._raw;
                        return (
                          <TableRow
                            {...getRowProps({ row })}
                            key={row.id}
                            onClick={() => raw && handleRowClick(raw)}
                            style={{ cursor: 'pointer' }}
                          >
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.info.header === 'sha' ? (
                                  <code style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--cds-layer-02)', padding: '2px 6px', borderRadius: '3px' }}>
                                    {cell.value}
                                  </code>
                                ) : (
                                  <span style={{ fontSize: '13px' }}>{cell.value}</span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}

        {commits.length > PAGE_SIZE && (
          <Pagination
            totalItems={commits.length}
            pageSize={PAGE_SIZE}
            pageSizes={[PAGE_SIZE]}
            page={page}
            onChange={({ page: p }) => setPage(p)}
          />
        )}
      </Tile>

      {/* Diff Modal */}
      <Modal
        open={modalOpen}
        modalHeading={selectedCommit?.message ?? selectedCommit?.commit?.message ?? '커밋 상세'}
        primaryButtonText="닫기"
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={() => setModalOpen(false)}
        size="lg"
        passiveModal={false}
      >
        {diffLoading ? (
          <InlineLoading description="diff를 불러오는 중..." />
        ) : diffError ? (
          <InlineNotification kind="error" title="오류" subtitle={diffError} hideCloseButton />
        ) : (
          <DiffView diff={diff} />
        )}
      </Modal>
    </div>
  );
}
