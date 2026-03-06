// @ts-nocheck
import { useEffect, useState } from 'react';
import {
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
  Button,
  Tag,
  SkeletonText,
  InlineNotification,
} from '@carbon/react';
import { Activity, Close } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { workstreamApi } from '../../api/workstream';

const headers = [
  { key: 'created_at', header: '날짜' },
  { key: 'workstream_id', header: 'Workstream ID' },
  { key: 'event_type', header: '타입' },
  { key: 'repo_name', header: '레포' },
  { key: 'author', header: '작성자' },
  { key: 'message', header: '메시지' },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  } catch {
    return iso;
  }
}

export default function SettingsWorkstreamEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterWsId, setFilterWsId] = useState(null);

  const fetchEvents = async (wsId?: string) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (wsId) {
        data = await workstreamApi.listEvents(wsId, 100);
      } else {
        data = await workstreamApi.listRecent(50);
      }
      setEvents(
        (data || []).map((e, i) => ({
          ...e,
          id: String(e.id ?? i),
        }))
      );
    } catch (err) {
      setError(err.message || '이벤트 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(filterWsId);
  }, [filterWsId]);

  return (
    <div>
      <PageHeader
        title="Workstream 이벤트"
        description="Git 커밋과 연결된 업무 이벤트 타임라인"
      />

      {filterWsId && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <Tag
            type="blue"
            filter
            onClose={() => setFilterWsId(null)}
          >
            {filterWsId}
          </Tag>
        </div>
      )}

      {error && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <InlineNotification
            kind="error"
            title="오류"
            subtitle={error}
            hideCloseButton
          />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '1rem' }}>
          <SkeletonText paragraph lines={6} />
        </div>
      ) : (
        <DataTable rows={events} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <TableToolbar>
                <TableToolbarContent>
                  <Button
                    kind="ghost"
                   
                    renderIcon={Activity}
                    onClick={() => { setFilterWsId(null); fetchEvents(); }}
                  >
                    새로고침
                  </Button>
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const raw = events.find((e) => e.id === row.id);
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => {
                          if (cell.info.header === 'created_at') {
                            return (
                              <TableCell key={cell.id} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                {formatDate(cell.value)}
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'workstream_id') {
                            return (
                              <TableCell key={cell.id}>
                                <Button
                                  kind="ghost"
                                 
                                  onClick={() => setFilterWsId(cell.value)}
                                  style={{ padding: 0, minHeight: 'auto' }}
                                >
                                  <Tag type="blue">{cell.value}</Tag>
                                </Button>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'event_type') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type="green">{cell.value}</Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'message') {
                            const url = raw?.url;
                            return (
                              <TableCell key={cell.id} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {url ? (
                                  <a href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                                    {cell.value}
                                  </a>
                                ) : cell.value}
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={headers.length} style={{ textAlign: 'center', color: '#6f6f6f' }}>
                        이벤트가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
}
