import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Button,
  Loading,
  InlineNotification,
  Tag,
} from '@carbon/react';
import { Renew, Download, Laptop } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { listComputers, type Computer } from '../../api/users';

const TABLE_HEADERS = [
  { key: 'name', header: '이름' },
  { key: 'dnsHostname', header: 'DNS 호스트명' },
  { key: 'os', header: '운영체제' },
  { key: 'osVersion', header: 'OS 버전' },
  { key: 'whenCreated', header: '생성일' },
];

export default function ComputersPage() {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedComp, setSelectedComp] = useState<Computer | null>(null);
  const didMount = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listComputers();
      setComputers(res.computers || []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; loadData(); }
  }, [loadData]);

  const rows = computers.map((c) => ({
    id: c.name || Math.random().toString(),
    name: c.name || '—',
    dnsHostname: c.dns_hostname || '—',
    os: c.os || '—',
    osVersion: c.os_version || '—',
    whenCreated: c.when_created || '—',
    _raw: c,
  }));

  const downloadCSV = () => {
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ['Name', 'DNS Hostname', 'OS', 'OS Version', 'Created', 'DN'];
    const csvRows = [headers.map(esc).join(',')];
    for (const c of computers) {
      csvRows.push([esc(c.name), esc(c.dns_hostname), esc(c.os), esc(c.os_version), esc(c.when_created), esc(c.dn)].join(','));
    }
    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyon-computers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <PageHeader
          title={`컴퓨터 ${!loading ? `(${computers.length})` : ''}`}
          description="도메인에 가입된 컴퓨터 목록"
        />

        {error && (
          <InlineNotification kind="error" title="로딩 오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loading description="컴퓨터 목록 로딩 중" withOverlay={false} />
          </div>
        ) : (
          <DataTable rows={rows} headers={TABLE_HEADERS} isSortable>
            {({ rows: tableRows, headers, getHeaderProps, getRowProps, getTableProps, getToolbarProps, onInputChange }) => (
              <TableContainer>
                <TableToolbar {...getToolbarProps()}>
                  <TableToolbarContent>
                    <TableToolbarSearch placeholder="컴퓨터 검색..." onChange={onInputChange} persistent />
                    <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly tooltipPosition="bottom" onClick={loadData} />
                    <Button kind="ghost" renderIcon={Download} iconDescription="CSV 다운로드" hasIconOnly tooltipPosition="bottom" onClick={downloadCSV} />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()} size="md">
                  <TableHead>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHeader {...getHeaderProps({ header: h })}>{h.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--cds-text-secondary)' }}>
                          도메인에 가입된 컴퓨터가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((row) => {
                        const raw = rows.find((r) => r.id === row.id)?._raw;
                        const rowProps = getRowProps({ row });
                        return (
                          <TableRow
                            {...rowProps}
                            onClick={() => { if (raw) setSelectedComp(raw); }}
                            style={{ cursor: 'pointer', background: selectedComp?.name === raw?.name ? 'var(--cds-layer-selected-01)' : undefined }}
                          >
                            {row.cells.map((cell) => {
                              if (cell.info.header === 'name') {
                                return (
                                  <TableCell key={cell.id}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <Laptop size={16} />
                                      <strong>{cell.value as string}</strong>
                                    </span>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'dnsHostname') {
                                return (
                                  <TableCell key={cell.id} style={{ fontFamily: 'IBM Plex Mono', fontSize: '0.8125rem' }}>
                                    {cell.value as string}
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'os') {
                                return (
                                  <TableCell key={cell.id}>
                                    {cell.value !== '—' ? <Tag type="blue" size="sm">{cell.value as string}</Tag> : '—'}
                                  </TableCell>
                                );
                              }
                              return <TableCell key={cell.id} style={{ fontSize: '0.8125rem' }}>{cell.value as string}</TableCell>;
                            })}
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
      </div>

      {/* Detail panel */}
      {selectedComp && (
        <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--cds-border-subtle)', background: 'var(--cds-layer-01)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
            <span style={{ fontWeight: 600 }}>{selectedComp.name}</span>
            <Button kind="ghost" size="sm" renderIcon={() => <span style={{ fontSize: '1rem' }}>✕</span>} iconDescription="닫기" hasIconOnly onClick={() => setSelectedComp(null)} />
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem', borderBottom: '1px solid var(--cds-border-subtle)', marginBottom: '1rem' }}>
              <Laptop size={36} style={{ marginBottom: 8 }} />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 400 }}>{selectedComp.name}</h3>
            </div>
            {[
              { label: 'DNS 호스트명', value: selectedComp.dns_hostname || '—', mono: true },
              { label: '운영체제', value: selectedComp.os || '—' },
              { label: 'OS 버전', value: selectedComp.os_version || '—' },
              { label: '생성일', value: selectedComp.when_created || '—' },
              { label: 'DN', value: selectedComp.dn || '—', mono: true, small: true },
            ].map(({ label, value, mono, small }) => (
              <div key={label} style={{ display: 'flex', gap: '0.5rem', padding: '6px 0', fontSize: small ? '0.75rem' : '0.8125rem', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ width: 100, flexShrink: 0, color: 'var(--cds-text-secondary)' }}>{label}</span>
                <span style={{ flex: 1, wordBreak: 'break-all', fontFamily: mono ? 'IBM Plex Mono' : undefined }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
