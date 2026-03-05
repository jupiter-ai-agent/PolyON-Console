// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Modal,
  TextInput,
  Tag,
  InlineLoading,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableExpandRow,
  TableExpandedRow,
  TableExpandHeader,
} from '@carbon/react';
import { Add, Renew, TrashCan, Link, Unlink } from '@carbon/icons-react';

const DEFAULT_GPOS = ['Default Domain Policy', 'Default Domain Controllers Policy'];

export default function SecurityGPOPage() {
  const [gpos, setGpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedGuid, setExpandedGuid] = useState(null);
  const [containers, setContainers] = useState({});

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  // Link modal
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkGuid, setLinkGuid] = useState('');
  const [linkDn, setLinkDn] = useState('');
  const [linkEnforce, setLinkEnforce] = useState(false);
  const [linkDisable, setLinkDisable] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/security/gpo');
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setGpos(data.gpos || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadContainers = async (guid) => {
    if (containers[guid]) return;
    try {
      const res = await fetch(`/api/v1/security/gpo/${encodeURIComponent(guid)}/containers`);
      const data = await res.json();
      setContainers(prev => ({ ...prev, [guid]: data.containers || [] }));
    } catch {
      setContainers(prev => ({ ...prev, [guid]: [] }));
    }
  };

  const doCreate = async () => {
    if (!createName.trim()) return;
    try {
      const res = await fetch('/api/v1/security/gpo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: createName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setCreateOpen(false);
      setCreateName('');
      await load();
    } catch (e) {
      alert('GPO 생성 실패: ' + e.message);
    }
  };

  const doDelete = async (guid, name) => {
    if (!confirm(`GPO "${name}" (${guid})을(를) 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/v1/security/gpo/${encodeURIComponent(guid)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      await load();
    } catch (e) {
      alert('GPO 삭제 실패: ' + e.message);
    }
  };

  const doLink = async () => {
    if (!linkDn.trim()) { alert('컨테이너 DN을 입력하세요.'); return; }
    try {
      const res = await fetch('/api/v1/security/gpo/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container_dn: linkDn, gpo_guid: linkGuid, enforce: linkEnforce, disable: linkDisable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setLinkOpen(false);
      setContainers(prev => { const n = { ...prev }; delete n[linkGuid]; return n; });
      if (expandedGuid === linkGuid) loadContainers(linkGuid);
    } catch (e) {
      alert('GPO 링크 실패: ' + e.message);
    }
  };

  const doUnlink = async (containerDn, guid) => {
    if (!confirm(`"${containerDn}"에서 GPO 링크를 해제하시겠습니까?`)) return;
    try {
      const res = await fetch('/api/v1/security/gpo/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ container_dn: containerDn, gpo_guid: guid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setContainers(prev => { const n = { ...prev }; delete n[guid]; return n; });
      loadContainers(guid);
    } catch (e) {
      alert('링크 해제 실패: ' + e.message);
    }
  };

  // DataTable headers
  const gpoHeaders = [
    { key: 'gpoName',  header: '정책 이름' },
    { key: 'guid',     header: 'GUID' },
    { key: 'statusTag',header: '상태' },
    { key: 'version',  header: '버전 (User / Computer)' },
    { key: 'actions',  header: '' },
  ];

  const gpoRows = gpos.map((g) => {
    const name = g.display_name || g.gpo || '-';
    const guid = g.gpo || g.gpo_guid || '-';
    const ver = parseInt(g.version || '0', 10);
    const verUser = ver >> 16;
    const verComputer = ver & 0xffff;
    const flags = g.flags || '0';
    let statusType = 'green', statusLabel = '활성';
    if (flags === '3') { statusType = 'red'; statusLabel = '모두 비활성'; }
    else if (flags === '1' || flags === '2') { statusType = 'gray'; statusLabel = '부분 비활성'; }
    const isDefault = DEFAULT_GPOS.includes(name);

    return {
      id: guid,
      gpoName: name,
      guid,
      statusTag: <Tag type={statusType}>{statusLabel}</Tag>,
      version: `${verUser} / ${verComputer}`,
      actions: (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <Button
            kind="ghost" size="sm" hasIconOnly renderIcon={Link} iconDescription="OU 링크"
            onClick={e => { e.stopPropagation(); setLinkGuid(guid); setLinkDn(''); setLinkEnforce(false); setLinkDisable(false); setLinkOpen(true); }}
          />
          {!isDefault && (
            <Button
              kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan} iconDescription="삭제"
              onClick={e => { e.stopPropagation(); doDelete(guid, name); }}
              style={{ color: 'var(--cds-support-error)' }}
            />
          )}
        </div>
      ),
      // extra info for expanded row
      _dn: g.dn,
      _guid: guid,
    };
  });

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>그룹 정책 (GPO)</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>Active Directory 그룹 정책 객체 생성, 삭제, OU 링크 관리</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>새로고침</Button>
          <Button kind="primary" size="sm" renderIcon={Add} onClick={() => { setCreateName(''); setCreateOpen(true); }}>새 GPO 생성</Button>
        </div>
      </div>

      {loading ? (
        <InlineLoading description="GPO 목록을 불러오는 중..." />
      ) : error ? (
        <div style={{ color: 'var(--cds-support-error)', padding: '16px' }}>{error}</div>
      ) : gpos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--cds-text-secondary)' }}>GPO가 없습니다.</div>
      ) : (
        <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
          <DataTable rows={gpoRows} headers={gpoHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getExpandHeaderProps, getExpandedRowProps }) => (
              <Table {...getTableProps()} size="sm">
                <TableHead>
                  <TableRow>
                    <TableExpandHeader {...getExpandHeaderProps()} />
                    {headers.map(h => (
                      <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => {
                    const original = gpoRows.find(r => r.id === row.id);
                    const guid = original?._guid;
                    const dn = original?._dn;
                    const isExpanded = expandedGuid === guid;

                    return (
                      <>
                        <TableExpandRow
                          key={row.id}
                          {...getRowProps({ row })}
                          isExpanded={isExpanded}
                          onExpand={() => {
                            if (isExpanded) {
                              setExpandedGuid(null);
                            } else {
                              setExpandedGuid(guid);
                              loadContainers(guid);
                            }
                          }}
                        >
                          {row.cells.map(cell => (
                            <TableCell
                              key={cell.id}
                              style={
                                cell.info.header === 'guid'
                                  ? { fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }
                                  : cell.info.header === 'gpoName'
                                    ? { fontWeight: 500 }
                                    : cell.info.header === 'actions'
                                      ? { textAlign: 'right' }
                                      : undefined
                              }
                            >
                              {cell.value}
                            </TableCell>
                          ))}
                        </TableExpandRow>
                        {isExpanded && (
                          <TableExpandedRow key={`${row.id}-expanded`} colSpan={headers.length + 1}>
                            <div style={{ padding: '16px 16px 16px 32px' }}>
                              <div style={{ marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{dn}</div>
                              <h5 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Link size={16} /> 링크된 컨테이너
                              </h5>
                              {containers[guid] === undefined ? (
                                <InlineLoading description="로딩 중..." />
                              ) : containers[guid].length === 0 ? (
                                <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>링크된 컨테이너가 없습니다.</span>
                              ) : (
                                containers[guid].map((c, ci) => (
                                  <div key={ci} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{c}</span>
                                    <Button
                                      kind="ghost" size="sm" hasIconOnly renderIcon={Unlink} iconDescription="링크 해제"
                                      onClick={() => doUnlink(c, guid)}
                                      style={{ color: 'var(--cds-support-error)' }}
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </TableExpandedRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </DataTable>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={doCreate}
        modalHeading="새 GPO 생성"
        primaryButtonText="생성"
        secondaryButtonText="취소"
        size="sm"
      >
        <TextInput
          id="gpo-name"
          labelText="GPO 이름"
          placeholder="예: Web Server Policy"
          value={createName}
          onChange={e => setCreateName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doCreate(); }}
          autoFocus
        />
      </Modal>

      {/* Link Modal */}
      <Modal
        open={linkOpen}
        onRequestClose={() => setLinkOpen(false)}
        onRequestSubmit={doLink}
        modalHeading="GPO 링크"
        primaryButtonText="링크"
        secondaryButtonText="취소"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          <TextInput
            id="link-dn"
            labelText="컨테이너 DN (OU 또는 도메인)"
            placeholder={`OU=Servers,${(window as any).PolyON_DOMAIN?.base_dn || 'DC=EXAMPLE,DC=COM'}`}
            value={linkDn}
            onChange={e => setLinkDn(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '16px' }}>
            <Checkbox
              id="link-enforce"
              labelText="강제 적용"
              checked={linkEnforce}
              onChange={(_, { checked }) => setLinkEnforce(checked)}
            />
            <Checkbox
              id="link-disable"
              labelText="비활성 링크"
              checked={linkDisable}
              onChange={(_, { checked }) => setLinkDisable(checked)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
