// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  Tile,
  Tag,
  Button,
  TextInput,
  Dropdown,
  DatePicker,
  DatePickerInput,
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
  InlineLoading,
} from '@carbon/react';

// ── API ──────────────────────────────────────────────────────────────────────

const fetchAuditLogs = async (params: { limit: number; offset: number; objectType?: string; action?: string; username?: string; startDate?: string; endDate?: string }) => {
  const query = new URLSearchParams();
  query.set('limit', String(params.limit));
  query.set('offset', String(params.offset));
  if (params.objectType) query.set('object_type', params.objectType);
  if (params.action) query.set('action', params.action);
  if (params.username) query.set('username', params.username);
  if (params.startDate) query.set('start_date', params.startDate);
  if (params.endDate) query.set('end_date', params.endDate);
  const resp = await fetch(`/api/v1/system/audit?${query}`);
  return resp.json();
};

// ── Constants ────────────────────────────────────────────────────────────────

const ACTION_ITEMS = [
  { id: '', label: '전체' },
  { id: 'CREATE', label: 'CREATE' },
  { id: 'UPDATE', label: 'UPDATE' },
  { id: 'DELETE', label: 'DELETE' },
  { id: 'LOGIN', label: 'LOGIN' },
  { id: 'POLICY_DENY', label: 'POLICY_DENY' },
];

const OBJECT_TYPE_ITEMS = [
  { id: '', label: '전체' },
  { id: 'user', label: 'user' },
  { id: 'group', label: 'group' },
  { id: 'gpo', label: 'gpo' },
  { id: 'policy_roles', label: 'policy_roles' },
  { id: 'ou', label: 'ou' },
  { id: 'drive_folder', label: 'drive_folder' },
];

const TABLE_HEADERS = [
  { key: 'timestamp', header: '시간' },
  { key: 'username', header: '사용자' },
  { key: 'action', header: '액션' },
  { key: 'object_type', header: '대상 유형' },
  { key: 'object_name', header: '대상 이름' },
  { key: 'ip_address', header: 'IP' },
  { key: 'detail', header: '상세' },
];

const PAGE_SIZE = 20;

// ── Tag color helper ──────────────────────────────────────────────────────────

function ActionTag({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    LOGIN: 'gray',
    POLICY_DENY: 'red',
  };
  const type = colorMap[action] ?? 'gray';
  return (
    <Tag type={type} style={action === 'POLICY_DENY' ? { fontWeight: 700 } : {}}>
      {action}
    </Tag>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Tile style={{ padding: '20px' }}>
      <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '0 0 8px' }}>{label}</p>
      <p
        style={{
          fontSize: '32px',
          fontWeight: 700,
          margin: 0,
          color: accent ? 'var(--cds-support-error)' : 'var(--cds-text-primary)',
        }}
      >
        {value}
      </p>
    </Tile>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityAuditLogPage() {
  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [actionFilter, setActionFilter] = useState(ACTION_ITEMS[0]);
  const [objectTypeFilter, setObjectTypeFilter] = useState(OBJECT_TYPE_ITEMS[0]);

  // Applied filters (used for actual fetch)
  const [appliedFilters, setAppliedFilters] = useState({
    username: '',
    action: '',
    objectType: '',
    startDate: '',
    endDate: '',
  });

  // Data state
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Summary state
  const [todayCount, setTodayCount] = useState(0);
  const [denyCount, setDenyCount] = useState(0);
  const [topUser, setTopUser] = useState('-');

  const loadLogs = useCallback(async (currentPage: number, filters: typeof appliedFilters) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const data = await fetchAuditLogs({
        limit: PAGE_SIZE,
        offset,
        objectType: filters.objectType || undefined,
        action: filters.action || undefined,
        username: filters.username || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      const items: any[] = data?.logs ?? data?.items ?? data?.data ?? (Array.isArray(data) ? data : []);
      const total: number = data?.total ?? data?.count ?? items.length;

      setLogs(items);
      setTotalCount(total);

      // Compute summary from loaded page (best-effort)
      const today = new Date().toISOString().slice(0, 10);
      setTodayCount(items.filter((l) => l.timestamp?.startsWith(today)).length);
      setDenyCount(items.filter((l) => l.action === 'POLICY_DENY').length);

      // Top user
      const userCount: Record<string, number> = {};
      items.forEach((l) => {
        if (l.username) userCount[l.username] = (userCount[l.username] ?? 0) + 1;
      });
      const sorted = Object.entries(userCount).sort((a, b) => b[1] - a[1]);
      setTopUser(sorted[0]?.[0] ?? '-');
    } catch (e: any) {
      setError('감사 로그를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(page, appliedFilters);
  }, [page, appliedFilters, loadLogs]);

  const handleSearch = () => {
    const filters = {
      username: usernameFilter,
      action: actionFilter.id,
      objectType: objectTypeFilter.id,
      startDate,
      endDate,
    };
    setPage(1);
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setUsernameFilter('');
    setActionFilter(ACTION_ITEMS[0]);
    setObjectTypeFilter(OBJECT_TYPE_ITEMS[0]);
    setStartDate('');
    setEndDate('');
    const reset = { username: '', action: '', objectType: '', startDate: '', endDate: '' };
    setPage(1);
    setAppliedFilters(reset);
  };

  // Prepare DataTable rows
  const tableRows = logs.map((log, idx) => ({
    id: String(log.id ?? log._id ?? idx),
    timestamp: log.timestamp
      ? new Date(log.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      : '-',
    username: log.username ?? '-',
    action: log.action ?? '-',
    object_type: log.object_type ?? '-',
    object_name: log.object_name ?? log.target ?? '-',
    ip_address: log.ip_address ?? log.ip ?? '-',
    detail: log.detail ?? log.message ?? '-',
  }));

  return (
    <div style={{ padding: '32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>감사 로그</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          모든 시스템 접근 및 관리 행위의 기록을 조회합니다
        </p>
      </div>

      {/* Filter Section */}
      <Tile style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
          }}
        >
          <DatePicker
            datePickerType="range"
            dateFormat="Y-m-d"
            onChange={(dates) => {
              if (dates[0]) setStartDate(dates[0].toISOString().slice(0, 10));
              if (dates[1]) setEndDate(dates[1].toISOString().slice(0, 10));
            }}
          >
            <DatePickerInput
              id="audit-start-date"
              labelText="시작일"
              placeholder="YYYY-MM-DD"
              size="md"
            />
            <DatePickerInput
              id="audit-end-date"
              labelText="종료일"
              placeholder="YYYY-MM-DD"
              size="md"
            />
          </DatePicker>

          <TextInput
            id="audit-username"
            labelText="사용자명"
            placeholder="예: john.doe"
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            style={{ width: '160px' }}
            size="md"
          />

          <Dropdown
            id="audit-action"
            titleText="액션 타입"
            label="전체"
            items={ACTION_ITEMS}
            itemToString={(item) => item?.label ?? ''}
            selectedItem={actionFilter}
            onChange={({ selectedItem }) => selectedItem && setActionFilter(selectedItem)}
            style={{ width: '160px' }}
          />

          <Dropdown
            id="audit-object-type"
            titleText="대상 유형"
            label="전체"
            items={OBJECT_TYPE_ITEMS}
            itemToString={(item) => item?.label ?? ''}
            selectedItem={objectTypeFilter}
            onChange={({ selectedItem }) => selectedItem && setObjectTypeFilter(selectedItem)}
            style={{ width: '160px' }}
          />

          <div style={{ display: 'flex', gap: '8px', paddingBottom: '1px' }}>
            <Button kind="primary" size="md" onClick={handleSearch}>
              검색
            </Button>
            <Button kind="secondary" size="md" onClick={handleReset}>
              초기화
            </Button>
          </div>
        </div>
      </Tile>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <SummaryCard label="전체 로그 수" value={totalCount.toLocaleString()} />
        <SummaryCard label="오늘 로그 수" value={todayCount.toLocaleString()} />
        <SummaryCard label="차단된 요청" value={denyCount.toLocaleString()} accent />
        <SummaryCard label="가장 활발한 사용자" value={topUser} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind="error"
            title="오류"
            subtitle={error}
            hideCloseButton
          />
        </div>
      )}

      {/* Log Table */}
      <Tile style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px' }}>
            <InlineLoading description="감사 로그를 불러오는 중..." />
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
                          감사 로그가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'action' ? (
                                <ActionTag action={String(cell.value)} />
                              ) : (
                                <span style={{ fontSize: '13px' }}>{cell.value}</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <Pagination
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
            pageSizes={[PAGE_SIZE]}
            page={page}
            onChange={({ page: p }) => setPage(p)}
          />
        )}
      </Tile>
    </div>
  );
}
