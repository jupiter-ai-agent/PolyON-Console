// @ts-nocheck
/**
 * Dashboard — Recent Alerts Card (Row 4)
 * Carbon Tile + DataTable + InlineNotification + Tag 사용
 */
import { useEffect, useState } from 'react';
import {
  Tile,
  SkeletonText,
  Tag,
  InlineNotification,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Warning } from '@carbon/icons-react';
import { dashboardApi, type Alert } from '../../../api/dashboard';

function levelTag(level?: string) {
  const l = (level || 'info').toLowerCase();
  if (l === 'critical' || l === 'error') return <Tag type="red" size="sm">{l}</Tag>;
  if (l === 'warning') return <Tag type="purple" size="sm">{l}</Tag>;
  return <Tag type="blue" size="sm">{l}</Tag>;
}

const headers = [
  { key: 'timestamp', header: '시간' },
  { key: 'level',     header: '레벨' },
  { key: 'message',   header: '메시지' },
];

export function AlertsCard() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    dashboardApi
      .alerts(5)
      .then(res => { if (!mounted) return; setAlerts(res.alerts || []); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const cardHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <Warning size={16} />
      <h4 className="cds--productive-heading-02">최근 알림</h4>
    </div>
  );

  if (loading) {
    return (
      <Tile>
        {cardHeader}
        <SkeletonText paragraph lineCount={4} />
      </Tile>
    );
  }

  if (error) {
    return (
      <Tile>
        {cardHeader}
        <InlineNotification
          kind="warning"
          title="연결 실패"
          subtitle="알림 API에 연결할 수 없습니다."
          lowContrast
          hideCloseButton
        />
      </Tile>
    );
  }

  if (alerts.length === 0) {
    return (
      <Tile>
        {cardHeader}
        <p style={{ color: 'var(--cds-text-placeholder)', fontSize: '13px' }}>
          최근 알림이 없습니다.
        </p>
      </Tile>
    );
  }

  const rows = alerts.map((a, i) => ({
    id: String(i),
    timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString('ko-KR') : '—',
    level: levelTag(a.level),
    message: a.message || '',
  }));

  return (
    <Tile style={{ padding: 0 }}>
      <div style={{ padding: '16px 16px 0' }}>
        {cardHeader}
      </div>
      <DataTable rows={rows} headers={headers}>
        {({ rows: tRows, headers: tHeaders, getHeaderProps, getRowProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()} size="sm">
              <TableHead>
                <TableRow>
                  {tHeaders.map(header => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tRows.map(row => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map(cell => (
                      <TableCell key={cell.id} style={{ fontSize: '12px' }}>
                        {cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </Tile>
  );
}
