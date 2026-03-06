
import { useEffect, useState, useCallback, useRef } from 'react';
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
  InlineLoading,
  Toggle,
} from '@carbon/react';
import { Pause, Play, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

interface LogEntry {
  _key: string;
  timestamp?: string;
  level?: string;
  event?: string;
  details?: string;
  context?: Record<string, unknown>;
  message?: string;
  _cat?: string;
}

const CATEGORIES = ['SMTP', 'IMAP', 'Queue', 'Delivery', 'HTTP', 'Other'] as const;
type Category = typeof CATEGORIES[number];

const MAX_BUFFER = 500;

const LEVEL_TAG: Record<string, 'blue' | 'green' | 'red' | 'purple' | 'gray'> = {
  error: 'red',
  warn: 'purple',
  info: 'blue',
  debug: 'gray',
  trace: 'gray',
};

function categorize(entry: LogEntry): Category {
  const ev = (entry.event ?? entry.message ?? '').toLowerCase();
  if (ev.includes('smtp')) return 'SMTP';
  if (ev.includes('imap')) return 'IMAP';
  if (ev.includes('queue')) return 'Queue';
  if (ev.includes('deliver') || ev.includes('send')) return 'Delivery';
  if (ev.includes('http') || ev.includes('api')) return 'HTTP';
  return 'Other';
}

function fmtTime(ts?: string): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}

let _keyCounter = 0;

export default function MailLiveTracingPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabledCats, setEnabledCats] = useState<Set<Category>>(new Set(CATEGORIES));
  const pausedRef = useRef(paused);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  pausedRef.current = paused;

  const fetchLogs = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const res = await fetch('/mail-proxy/logs/live?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      const items: LogEntry[] = (data?.items ?? data ?? []).map((item: LogEntry) => ({
        ...item,
        _key: String(++_keyCounter),
        _cat: categorize(item),
      }));
      if (items.length === 0) return;
      setLogs((prev) => {
        const combined = [...prev, ...items];
        return combined.slice(-MAX_BUFFER);
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(fetchLogs, 3000);
    fetchLogs();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLogs]);

  const toggleCat = (cat: Category) => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filteredLogs = logs.filter((l) => enabledCats.has((l._cat as Category) ?? 'Other'));

  const headers = [
    { key: 'time', header: '시간' },
    { key: 'level', header: '레벨' },
    { key: 'event', header: '이벤트' },
    { key: 'details', header: '상세' },
  ];

  const rows = filteredLogs.map((l) => ({
    id: l._key,
    time: fmtTime(l.timestamp),
    level: l.level ?? 'info',
    event: l.event ?? l.message ?? '—',
    details: l.details ?? (l.context ? JSON.stringify(l.context).slice(0, 120) : '—'),
  }));

  return (
    <>
      <PageHeader title="실시간 로그" description="메일 서버 실시간 로그 스트림 (3초 폴링, 최대 500건)" />

      {/* 컨트롤 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button
          kind={paused ? 'primary' : 'tertiary'}
         
          renderIcon={paused ? Play : Pause}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? '재개' : '일시정지'}
        </Button>
        <Button
          kind="ghost"
         
          renderIcon={TrashCan}
          onClick={() => setLogs([])}
        >
          버퍼 지우기
        </Button>
        <span style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>
          {filteredLogs.length} / {MAX_BUFFER}건 표시 중
        </span>
        {loading && <InlineLoading description="로딩 중…" />}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>카테고리 필터:</span>
        {CATEGORIES.map((cat) => (
          <Toggle
            key={cat}
            id={`cat-toggle-${cat}`}
            labelText={cat}
           
            toggled={enabledCats.has(cat)}
            onToggle={() => toggleCat(cat)}
            hideLabel={false}
          />
        ))}
      </div>

      {/* 로그 테이블 */}
      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps }) => (
          <div style={{ fontFamily: "monospace", fontSize: 12 }}><Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {dtRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={dtHeaders.length} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>
                    {paused ? '일시정지 중' : '로그 대기 중…'}
                  </TableCell>
                </TableRow>
              ) : dtRows.map((row) => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id} style={{
                      whiteSpace: cell.info.header === 'time' ? 'nowrap' : undefined,
                      maxWidth: cell.info.header === 'details' ? 400 : undefined,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {cell.info.header === 'level' ? (
                        <Tag type={(LEVEL_TAG[String(cell.value).toLowerCase()] ?? 'gray') as 'gray'}>
                          {String(cell.value).toUpperCase()}
                        </Tag>
                      ) : String(cell.value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </DataTable>

      <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--cds-text-secondary)' }}>
        {paused ? '일시정지 상태입니다. 재개를 누르면 폴링이 다시 시작됩니다.' : '3초마다 자동 갱신 중'}
      </div>
    </>
  );
}
