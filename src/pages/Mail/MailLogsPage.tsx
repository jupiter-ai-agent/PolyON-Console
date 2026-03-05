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
  Tag,
  InlineLoading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, fmtDate, type LogItem } from '../../api/mail';

type LevelFilter = 'all' | 'INFO' | 'WARN' | 'ERROR';

export default function MailLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<LevelFilter>('all');

  const load = async () => {
    setLoading(true);
    try {
      const r = await mailApi.listLogs({ limit: 100 });
      setLogs(r.data?.items ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = level === 'all' ? logs : logs.filter((l) => l.level === level);

  const headers = [
    { key: 'timestamp', header: '시간' },
    { key: 'level', header: '레벨' },
    { key: 'event', header: '이벤트' },
    { key: 'details', header: '상세' },
  ];

  const rows = filtered.map((log, i) => ({
    id: String(i),
    timestamp: fmtDate(log.timestamp),
    level: log.level ?? '—',
    event: log.event ?? '—',
    details: typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details ?? ''),
  }));

  return (
    <>
      <PageHeader title="메일 로그" description="Stalwart 서버 실시간 로그" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <Tabs
          selectedIndex={(['all', 'INFO', 'WARN', 'ERROR'] as LevelFilter[]).indexOf(level)}
          onChange={({ selectedIndex }) => setLevel((['all', 'INFO', 'WARN', 'ERROR'] as LevelFilter[])[selectedIndex])}
        >
          <TabList aria-label="로그 레벨 필터">
            <Tab>전체</Tab>
            <Tab>INFO</Tab>
            <Tab>WARN</Tab>
            <Tab>ERROR</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }} />
            <TabPanel style={{ padding: 0 }} />
            <TabPanel style={{ padding: 0 }} />
            <TabPanel style={{ padding: 0 }} />
          </TabPanels>
        </Tabs>
        <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
      </div>

      <DataTable rows={rows} headers={headers} size="sm">
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
              ) : dtRows.length === 0 ? (
                <TableRow><TableCell colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>로그가 없습니다</TableCell></TableRow>
              ) : dtRows.map((row) => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        fontSize: 13,
                        fontFamily: cell.info.header === 'details' || cell.info.header === 'event' ? 'monospace' : undefined,
                        whiteSpace: cell.info.header === 'timestamp' ? 'nowrap' : undefined,
                        maxWidth: cell.info.header === 'details' ? 400 : undefined,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: cell.info.header === 'details' ? 'var(--cds-text-secondary)' : undefined,
                      }}
                    >
                      {cell.info.header === 'level' ? (
                        <Tag type={cell.value === 'ERROR' ? 'red' : cell.value === 'WARN' ? 'purple' : 'blue'} size="sm">
                          {cell.value}
                        </Tag>
                      ) : String(cell.value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>

      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>
        {filtered.length}건 표시
      </div>
    </>
  );
}
