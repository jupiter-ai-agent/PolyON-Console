import { useEffect, useState } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  Toggle,
  InlineNotification,
  InlineLoading,
} from '@carbon/react';
import { Play, Renew } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

interface CronRecord {
  id: number;
  name: string;
  active: boolean;
  interval_number: number;
  interval_type: string;
  nextcall: string | false | null;
  numbercall: number;
  model_id: [number, string] | false | null;
  priority: number;
}

interface CronResponse {
  success: boolean;
  crons: CronRecord[];
  count: number;
}

const headers = [
  { key: 'active', header: '활성' },
  { key: 'name', header: '이름' },
  { key: 'interval', header: '주기' },
  { key: 'nextcall', header: '다음 실행' },
  { key: 'numbercall', header: '실행 횟수' },
  { key: 'actions', header: '액션' },
];

export default function AppEngineCronPage() {
  const [crons, setCrons] = useState<CronRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    kind: 'success' | 'error';
    title: string;
    subtitle: string;
  } | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);

  const fetchCrons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<CronResponse>('/appengine/cron');
      setCrons(res.crons || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '스케줄러 목록 조회 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const handleToggle = async (cron: CronRecord, checked: boolean) => {
    setTogglingId(cron.id);
    setNotification(null);
    try {
      await apiFetch(`/appengine/cron/${cron.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: checked }),
      });
      setCrons((prev) =>
        prev.map((c) => (c.id === cron.id ? { ...c, active: checked } : c))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업데이트 실패';
      setNotification({ kind: 'error', title: '저장 실패', subtitle: msg });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRun = async (cron: CronRecord) => {
    setRunningId(cron.id);
    setNotification(null);
    try {
      await apiFetch(`/appengine/cron/${cron.id}/run`, { method: 'POST' });
      setNotification({
        kind: 'success',
        title: '실행 완료',
        subtitle: `'${cron.name}' 스케줄러가 실행되었습니다.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '실행 실패';
      setNotification({ kind: 'error', title: '실행 실패', subtitle: msg });
    } finally {
      setRunningId(null);
    }
  };

  const formatNextCall = (nextcall: string | false | null): string => {
    if (!nextcall) return '-';
    try {
      return new Date(nextcall).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(nextcall);
    }
  };

  const rows = crons.map((cron) => ({
    id: String(cron.id),
    active: cron,
    name: cron.name,
    interval: `${cron.interval_number} ${cron.interval_type}`,
    nextcall: formatNextCall(cron.nextcall),
    numbercall: cron.numbercall === -1 ? '\u221e' : String(cron.numbercall),
    actions: cron,
  }));

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f4' }}>
          스케줄러 관리
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#8d8d8d' }}>
          AppEngine(Odoo) 예약 작업(ir.cron)을 조회하고 관리합니다
        </p>
      </div>

      {notification && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind={notification.kind}
            title={notification.title}
            subtitle={notification.subtitle}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      {error && !loading && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind="error"
            title="조회 실패"
            subtitle={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8d8d8d' }}>
          <InlineLoading description="스케줄러 목록 로딩 중..." />
        </div>
      ) : (
        <DataTable rows={rows} headers={headers} size="sm">
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <TableToolbar>
                <TableToolbarContent>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Renew}
                    onClick={fetchCrons}
                    disabled={loading}
                    iconDescription="새로고침"
                  >
                    새로고침
                  </Button>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: '16px',
                      color: '#8d8d8d',
                      fontSize: '0.8rem',
                    }}
                  >
                    {crons.length}개
                  </div>
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHeader key={header.key} {...getHeaderProps({ header })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row) => {
                    const cron = crons.find((c) => String(c.id) === row.id);
                    if (!cron) return null;
                    return (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        <TableCell>
                          {togglingId === cron.id ? (
                            <InlineLoading style={{ width: '48px' }} />
                          ) : (
                            <Toggle
                              id={`toggle-${cron.id}`}
                              size="sm"
                              toggled={cron.active}
                              labelA=""
                              labelB=""
                              onToggle={(checked: boolean) => handleToggle(cron, checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell>{cron.name}</TableCell>
                        <TableCell>{`${cron.interval_number} ${cron.interval_type}`}</TableCell>
                        <TableCell>{formatNextCall(cron.nextcall)}</TableCell>
                        <TableCell>{cron.numbercall === -1 ? '\u221e' : cron.numbercall}</TableCell>
                        <TableCell>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Play}
                            iconDescription="수동 실행"
                            hasIconOnly
                            disabled={runningId === cron.id}
                            onClick={() => handleRun(cron)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
}
