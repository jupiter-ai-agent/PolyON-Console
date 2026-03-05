// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, TextInput, Tag,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
} from '@carbon/react';
import { Renew, Search } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

const headers = [
  { key: 'name', header: '이름' },
  { key: 'displayName', header: '표시 이름' },
  { key: 'type', header: '유형' },
  { key: 'memberCount', header: '멤버' },
  { key: 'purpose', header: '목적' },
];

export default function ChatChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamId, setTeamId] = useState('');

  const load = useCallback(async (tid?: string) => {
    setLoading(true);
    setError('');
    try {
      const path = tid
        ? `/channels?team_id=${encodeURIComponent(tid)}&page=0&per_page=200`
        : '/channels?page=0&per_page=200';
      const res = await fetch(BASE + path);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setChannels(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const channelTagType = (type: string) => {
    if (type === 'O') return { tagType: 'green', label: '공개' };
    if (type === 'P') return { tagType: 'warm-gray', label: '비공개' };
    return { tagType: 'gray', label: type || '—' };
  };

  const rows = channels.map((ch, i) => {
    const ct = channelTagType(ch.type);
    return {
      id: ch.id || String(i),
      name: ch.name || '—',
      displayName: ch.display_name || '—',
      type: <Tag type={ct.tagType as any}>{ct.label}</Tag>,
      memberCount: ch.member_count ?? '—',
      purpose: ch.purpose || '—',
    };
  });

  return (
    <>
      <PageHeader
        title="채널 관리"
        description="Mattermost 채널 목록"
        actions={
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            onClick={() => load(teamId)}
          >
            새로고침
          </Button>
        }
      />

      {/* Filter */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <TextInput
            id="channel-team-filter"
            labelText="팀 ID 필터"
            placeholder="팀 ID 입력 (비우면 전체)"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          />
        </div>
        <Button
          kind="primary"
          renderIcon={Search}
          onClick={() => load(teamId)}
        >
          검색
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)', marginTop: '1rem' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28', marginTop: '1rem' }}>오류: {error}</div>
      ) : channels.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
          채널이 없습니다.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>채널 목록 ({channels.length})</span>
          </div>
          <DataTable rows={rows} headers={headers}>
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()} size="sm">
                <TableHead>
                  <TableRow>
                    {tableHeaders.map(h => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map(row => (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map(cell => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTable>
        </div>
      )}
    </>
  );
}
