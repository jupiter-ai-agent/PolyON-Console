// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Button,
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
} from '@carbon/react';
import { Security as Shield, Folder, Search, Renew, ChevronRight } from  '@carbon/icons-react';

function parseAces(raw) {
  if (!raw) return [];
  const aces = [];
  const lines = (raw || '').split('\n');
  const sddlTrustee = { DA: 'Domain Admins', DU: 'Domain Users', EA: 'Enterprise Admins', SA: 'Schema Admins', BA: 'BUILTIN\\Administrators', BU: 'BUILTIN\\Users', AU: 'Authenticated Users', WD: 'Everyone', SY: 'SYSTEM', CO: 'Creator Owner' };
  const rightsMap = { GA: 'GENERIC_ALL', GR: 'GENERIC_READ', GW: 'GENERIC_WRITE', RC: 'READ_CONTROL', SD: 'DELETE', WD: 'WRITE_DAC', WO: 'WRITE_OWNER', RP: 'READ_PROP', WP: 'WRITE_PROP', CC: 'CREATE_CHILD', DC: 'DELETE_CHILD', LC: 'LIST_CHILDREN', SW: 'SELF_WRITE', LO: 'LIST_OBJECT', DT: 'DELETE_TREE', CR: 'CONTROL_ACCESS' };

  for (const line of lines) {
    const trimmed = line.trim();
    const sddlMatch = trimmed.match(/\(([AD]);[^;]*;([^;]*);[^;]*;[^;]*;([^)]+)\)/);
    if (sddlMatch) {
      const type = sddlMatch[1] === 'A' ? 'ALLOW' : 'DENY';
      const rights = sddlMatch[2] || '';
      const trustee = sddlTrustee[sddlMatch[3]] || sddlMatch[3];
      const decoded = [];
      for (let i = 0; i < rights.length; i += 2) {
        const pair = rights.substring(i, i + 2);
        decoded.push(rightsMap[pair] || pair);
      }
      aces.push({ type, trustee, rights: decoded.join(', ') });
      continue;
    }
    const readableMatch = trimmed.match(/^(Allow|Deny)\s+(.+?)\s+((?:FULL|READ|WRITE|DELETE|CREATE|LIST|SPECIAL|GENERIC).*)$/i);
    if (readableMatch) {
      aces.push({ type: readableMatch[1].toUpperCase(), trustee: readableMatch[2], rights: readableMatch[3] });
    }
  }
  return aces;
}

const aceHeaders = [
  { key: 'trustee', header: '주체 (Trustee)' },
  { key: 'aceType', header: '유형' },
  { key: 'rights',  header: '권한' },
];

function AceTable({ aces }) {
  if (!aces.length) return <span style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>ACE를 파싱할 수 없거나 비어 있습니다.</span>;

  const rows = aces.map((a, i) => ({
    id: String(i),
    trustee: a.trustee,
    aceType: <Tag type={a.type === 'ALLOW' ? 'green' : 'red'}>{a.type}</Tag>,
    rights: a.rights,
  }));

  return (
    <DataTable rows={rows} headers={aceHeaders}>
      {({ rows: tRows, headers: tHeaders, getTableProps, getHeaderProps, getRowProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {tHeaders.map(h => (
                <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tRows.map(row => (
              <TableRow {...getRowProps({ row })} key={row.id}>
                {row.cells.map(cell => (
                  <TableCell
                    key={cell.id}
                    style={cell.info.header === 'rights' ? { fontSize: '12px' } : undefined}
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
  );
}

const SERVICE_ROWS = [
  { name: 'PolyON UI', auth: 'Keycloak OIDC', scope: '내부 네트워크', sso: true },
  { name: 'Keycloak', auth: '자체 인증', scope: '내부 네트워크', sso: null },
  { name: 'Stalwart Mail', auth: 'Basic Auth / OIDC', scope: '내부 + 외부 (메일)', sso: 'planned' },
  { name: 'RustFS', auth: 'Access/Secret Key', scope: '내부 네트워크', sso: null },
  { name: 'pgAdmin', auth: 'Keycloak OAuth2', scope: '내부 네트워크', sso: true },
  { name: 'Grafana', auth: 'Keycloak OAuth2', scope: '내부 네트워크', sso: true },
  { name: 'Elasticsearch', auth: 'X-Pack Basic Auth', scope: '내부 네트워크', sso: null },
];

const serviceHeaders = [
  { key: 'name',  header: '서비스' },
  { key: 'auth',  header: '인증 방식' },
  { key: 'scope', header: '접근 범위' },
  { key: 'sso',   header: 'SSO' },
];

const serviceRows = SERVICE_ROWS.map((s, i) => ({
  id: String(i),
  name: s.name,
  auth: s.auth,
  scope: s.scope,
  sso: s.sso === true
    ? <Tag type="green">지원</Tag>
    : s.sso === 'planned'
      ? <Tag type="gray">예정</Tag>
      : <span style={{ color: 'var(--cds-text-secondary)' }}>-</span>,
}));

export default function SecurityACLPage() {
  const [ouAcls, setOuAcls] = useState([]);
  const [ouLoading, setOuLoading] = useState(true);
  const [ouError, setOuError] = useState('');
  const [expandedOus, setExpandedOus] = useState({});

  const [lookupDn, setLookupDn] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const loadOuAcls = async () => {
    setOuLoading(true);
    setOuError('');
    try {
      const res = await fetch('/api/v1/security/acl/ous');
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setOuAcls(data.ou_acls || []);
    } catch (e) {
      setOuError(e.message);
    }
    setOuLoading(false);
  };

  useEffect(() => { loadOuAcls(); }, []);

  const lookupAcl = async () => {
    if (!lookupDn.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await fetch(`/api/v1/security/acl?dn=${encodeURIComponent(lookupDn)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API 오류');
      setLookupResult({ aces: parseAces(data.output || ''), raw: data.output || '결과 없음' });
    } catch (e) {
      setLookupError(e.message);
    }
    setLookupLoading(false);
  };

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>접근 제어 (ACL)</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>Active Directory 객체 DACL 조회 및 OU별 권한 목록</p>
      </div>

      {/* Service ACL Overview */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} /> 서비스 접근 개요
        </h4>
        <DataTable rows={serviceRows} headers={serviceHeaders}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
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
                        style={cell.info.header === 'name' ? { fontWeight: 500 } : undefined}
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
      </div>

      {/* OU ACL */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={20} /> OU별 DACL
          </h4>
          <Button kind="ghost" renderIcon={Renew} onClick={loadOuAcls}>새로고침</Button>
        </div>
        {ouLoading ? (
          <InlineLoading description="OU ACL을 불러오는 중..." />
        ) : ouError ? (
          <div style={{ color: 'var(--cds-support-error)', fontSize: '13px' }}>{ouError}</div>
        ) : ouAcls.length === 0 ? (
          <div style={{ color: 'var(--cds-text-secondary)', fontSize: '13px' }}>OU가 없습니다.</div>
        ) : (
          ouAcls.map((ou, i) => {
            const aces = parseAces(ou.acl || '');
            const isOpen = expandedOus[i];
            return (
              <div key={i} style={{ marginBottom: '8px', borderTop: i > 0 ? '1px solid var(--cds-border-subtle-00)' : undefined, paddingTop: i > 0 ? '8px' : 0 }}>
                <div
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px', fontWeight: 500 }}
                  onClick={() => setExpandedOus(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} />
                  <Folder size={16} />
                  <span>{ou.name || ou.dn}</span>
                  <span style={{ color: 'var(--cds-text-secondary)', fontWeight: 400, fontSize: '12px', marginLeft: 'auto' }}>{aces.length} ACE</span>
                </div>
                {isOpen && (
                  <div style={{ marginLeft: '24px' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>{ou.dn}</div>
                    <AceTable aces={aces} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual lookup */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} /> DN별 ACL 조회
        </h4>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextInput
              id="acl-dn"
              labelText="Distinguished Name (DN)"
              placeholder={`CN=Users,${(window as any).PolyON_DOMAIN?.base_dn || 'DC=EXAMPLE,DC=COM'}`}
              value={lookupDn}
              onChange={e => setLookupDn(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') lookupAcl(); }}
            />
          </div>
          <Button kind="primary" renderIcon={Search} onClick={lookupAcl} disabled={lookupLoading}>
            {lookupLoading ? '조회 중...' : '조회'}
          </Button>
        </div>
        {lookupError && <div style={{ color: 'var(--cds-support-error)', fontSize: '13px', marginTop: '12px' }}>{lookupError}</div>}
        {lookupResult && (
          <div style={{ marginTop: '16px' }}>
            {lookupResult.aces.length > 0 ? (
              <AceTable aces={lookupResult.aces} />
            ) : (
              <pre style={{ padding: '12px', background: 'var(--cds-layer-02)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--cds-border-subtle-00)' }}>{lookupResult.raw}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
