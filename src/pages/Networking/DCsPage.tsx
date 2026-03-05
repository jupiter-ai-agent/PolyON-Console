// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Tag,
  InlineLoading,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';

export default function DCsPage() {
  const [dcStatus, setDcStatus] = useState(null);
  const [fsmo, setFsmo] = useState(null);
  const [level, setLevel] = useState(null);
  const [repl, setRepl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [dcRes, cRes, fsmoRes, lvlRes, replRes] = await Promise.allSettled([
        fetch('/api/v1/domain/info').then(r => r.json()),
        fetch('/api/v1/containers/').then(r => r.json()),
        fetch('/api/v1/domain/fsmo').then(r => r.json()),
        fetch('/api/v1/dns/domain/level').then(r => r.json()),
        fetch('/api/v1/domain/replication').then(r => r.json()),
      ]);

      if (dcRes.status === 'fulfilled' && cRes.status === 'fulfilled') {
        const domainInfo = dcRes.value;
        const containers = cRes.value.containers || [];
        const dc = containers.find(c => c.name === 'polyon-dc');
        const isHealthy = dc && dc.state === 'running' && dc.status.includes('healthy');
        setDcStatus({ ...domainInfo, isHealthy, dcStatus: dc?.status || '—' });
      }
      if (fsmoRes.status === 'fulfilled') setFsmo(fsmoRes.value);
      if (lvlRes.status === 'fulfilled') setLevel(lvlRes.value);
      if (replRes.status === 'fulfilled') setRepl(replRes.value);
      setLoading(false);
    };
    load();
  }, []);

  const FSMO_ROLES = [
    { name: 'Schema Master', key: 'schema' },
    { name: 'Domain Naming Master', key: 'naming' },
    { name: 'PDC Emulator', key: 'pdc' },
    { name: 'RID Pool Manager', key: 'rid' },
    { name: 'Infrastructure Master', key: 'infrastructure' },
  ];

  // DC Status DataTable
  const dcHeaders = [
    { key: 'host', header: '호스트' },
    { key: 'status', header: '상태' },
    { key: 'detail', header: '상세' },
  ];
  const dcRows = dcStatus
    ? [
        {
          id: '0',
          host: `dc1.${(dcStatus.realm || '').toLowerCase()}`,
          status: dcStatus.isHealthy ? <Tag type="green">정상</Tag> : <Tag type="red">오류</Tag>,
          detail: dcStatus.dcStatus,
        },
      ]
    : [];

  // FSMO DataTable
  const fsmoHeaders = [
    { key: 'role', header: '역할' },
    { key: 'owner', header: '소유자' },
  ];
  const fsmoRows = fsmo
    ? FSMO_ROLES.map((r, i) => ({
        id: String(i),
        role: r.name,
        owner: fsmo[r.key] || fsmo.raw || '—',
      }))
    : [];

  // Domain Level DataTable
  const levelHeaders = [
    { key: 'label', header: '항목' },
    { key: 'value', header: '값' },
  ];
  const levelRows = level
    ? [
        { id: '0', label: 'Domain Function Level', value: level.domain_level || '—' },
        { id: '1', label: 'Forest Function Level', value: level.forest_level || '—' },
        { id: '2', label: 'Lowest DC Level', value: level.lowest_dc_level || '—' },
      ]
    : [];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Domain Controllers</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>도메인 컨트롤러 상태 및 FSMO 역할</p>
      </div>

      {loading ? (
        <InlineLoading description="로딩 중..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* DC Status */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>도메인 컨트롤러</h3>
              {dcStatus ? (
                <>
                  <DataTable rows={dcRows} headers={dcHeaders}>
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                      <Table {...getTableProps()} size="sm">
                        <TableHead>
                          <TableRow>
                            {headers.map(h => (
                              <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map(row => (
                            <TableRow {...getRowProps({ row })} key={row.id}>
                              {row.cells.map(cell => (
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DataTable>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
                    Realm: <code>{dcStatus.realm}</code> · Base DN: <code>{dcStatus.base_dn}</code>
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>정보를 가져올 수 없습니다</span>
              )}
            </div>

            {/* FSMO */}
            <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>FSMO 역할</h3>
              {fsmo ? (
                <DataTable rows={fsmoRows} headers={fsmoHeaders}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()} size="sm">
                      <TableHead>
                        <TableRow>
                          {headers.map(h => (
                            <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map(row => (
                          <TableRow {...getRowProps({ row })} key={row.id}>
                            {row.cells.map(cell => (
                              <TableCell
                                key={cell.id}
                                style={cell.info.header === 'owner' ? { fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' } : undefined}
                              >
                                {cell.value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DataTable>
              ) : (
                <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>FSMO 정보를 가져올 수 없습니다 (단일 DC 환경)</span>
              )}
            </div>
          </div>

          {/* Domain Level */}
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>도메인 기능 수준</h3>
            {level ? (
              <DataTable rows={levelRows} headers={levelHeaders}>
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map(h => (
                          <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            ) : (
              <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>—</span>
            )}
          </div>

          {/* Replication */}
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>복제 상태</h3>
            {repl?.output ? (
              <pre style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', padding: '12px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', margin: 0 }}>{repl.output}</pre>
            ) : (
              <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>단일 DC 환경 — 복제 파트너 없음</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
