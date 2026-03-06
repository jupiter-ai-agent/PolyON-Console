// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Button,
  TextInput,
  Tag,
  InlineLoading,
  Select,
  SelectItem,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Add, Renew, Edit, TrashCan, Globe } from '@carbon/icons-react';

const PLACEHOLDERS = {
  A: '192.168.1.10', AAAA: '::1', CNAME: 'target.example.com',
  MX: '10 mail.example.com', TXT: 'v=spf1 include:...', SRV: '0 100 389 dc1.example.com', PTR: 'host.example.com',
};

// DNS 타입별 Tag 색상 매핑
const DNS_TYPE_TAG: Record<string, string> = {
  SOA: 'purple', NS: 'blue', A: 'green', MX: 'magenta', TXT: 'teal', CNAME: 'cyan',
};
function getDnsTagType(type: string): string {
  return DNS_TYPE_TAG[type] || 'gray';
}

function parseRecords(output) {
  const records = [];
  const lines = (output || '').split('\n');
  let currentName = '';
  lines.forEach(l => {
    const nameMatch = l.match(/Name=(.*),\s*Records/);
    if (nameMatch) { currentName = nameMatch[1].trim() || '@'; return; }
    const recMatch = l.match(/(\w+):\s+(.*)/);
    if (recMatch && currentName) {
      records.push({ name: currentName, type: recMatch[1], data: recMatch[2].trim() });
    }
  });
  return records;
}

function cleanData(data) {
  return (data || '').replace(/\s*\(flags=.*$/, '').trim();
}

export default function DNSPage() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [records, setRecords] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'A', data: '' });

  const loadZones = async () => {
    setZonesLoading(true);
    try {
      const data = await fetch('/api/v1/dns/zones').then(r => r.json());
      const output = data.output || '';
      const lines = output.split('\n');
      const z = [];
      lines.forEach(l => {
        const m = l.match(/pszZoneName\s*:\s*(.+)/);
        if (m) z.push(m[1].trim());
      });
      setZones(z);
    } catch {}
    setZonesLoading(false);
  };

  const selectZone = async (zone) => {
    setSelectedZone(zone);
    setRecordsLoading(true);
    setRecords([]);
    setShowAddForm(false);
    try {
      const res = await fetch(`/api/v1/dns/zones/${zone}/records`);
      const data = await res.json();
      setRecords(parseRecords(data.output || data.error || ''));
    } catch {}
    setRecordsLoading(false);
  };

  useEffect(() => { loadZones(); }, []);

  const submitAdd = async () => {
    if (!form.name || !form.data) { alert('Name과 Data를 입력하세요.'); return; }
    try {
      if (editRecord) {
        await fetch(`/api/v1/dns/zones/${selectedZone}/records`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editRecord),
        });
      }
      await fetch(`/api/v1/dns/zones/${selectedZone}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowAddForm(false);
      setEditRecord(null);
      await selectZone(selectedZone);
    } catch (e) {
      alert('레코드 추가 실패: ' + e.message);
    }
  };

  const deleteRec = async (rec) => {
    if (!confirm('이 레코드를 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/v1/dns/zones/${selectedZone}/records`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec),
      });
      await selectZone(selectedZone);
    } catch (e) {
      alert('레코드 삭제 실패: ' + e.message);
    }
  };

  const startEdit = (rec) => {
    setEditRecord({ name: rec.name, type: rec.type, data: rec.data });
    setForm({ name: rec.name, type: rec.type, data: cleanData(rec.data) });
    setShowAddForm(true);
  };

  const filteredZones = zones.filter(z => z.toLowerCase().includes(search.toLowerCase()));

  // DataTable rows/headers for DNS records
  const dnsHeaders = [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type' },
    { key: 'data', header: 'Data' },
    { key: 'actions', header: '' },
  ];

  const dnsRows = records.map((r, i) => {
    const isSystem = r.type === 'SOA' || (r.type === 'NS' && r.name === '@');
    const cd = cleanData(r.data);
    return {
      id: String(i),
      name: r.name,
      type: <Tag type={getDnsTagType(r.type)}>{r.type}</Tag>,
      data: cd,
      actions: !isSystem ? (
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button kind="ghost" hasIconOnly renderIcon={Edit} iconDescription="편집" onClick={() => startEdit(r)} />
          <Button
            kind="ghost"
           
            hasIconOnly
            renderIcon={TrashCan}
            iconDescription="삭제"
            onClick={() => deleteRec({ name: r.name, type: r.type, data: cd })}
            style={{ color: 'var(--cds-support-error)' }}
          />
        </div>
      ) : null,
    };
  });

  return (
    <div style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>DNS</h1>
            <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '4px 0 0' }}>Active Directory DNS 존 및 레코드 관리</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button kind="primary"  renderIcon={Add} disabled={!selectedZone} onClick={() => { setEditRecord(null); setForm({ name: '', type: 'A', data: '' }); setShowAddForm(true); }}>레코드 추가</Button>
            <Button kind="ghost" renderIcon={Renew} onClick={loadZones}>새로고침</Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', padding: '0 32px 32px', minHeight: 0 }}>
        {/* Zone List */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--cds-text-secondary)' }}>DNS Zones</h3>
          <TextInput
            id="dns-search"
            labelText=""
            placeholder="항목 검색"
           
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ border: '1px solid var(--cds-border-subtle-00)', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
            {zonesLoading ? (
              <div style={{ padding: '16px' }}><InlineLoading description="Loading zones..." /></div>
            ) : filteredZones.length === 0 ? (
              <div style={{ padding: '16px', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>No DNS zones found</div>
            ) : (
              filteredZones.map(z => (
                <div
                  key={z}
                  onClick={() => selectZone(z)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--cds-border-subtle-00)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: selectedZone === z ? 'var(--cds-layer-selected)' : undefined,
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  <Globe size={16} />
                  {z}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Records */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--cds-text-secondary)' }}>
            {selectedZone ? `Records — ${selectedZone}` : 'Select a zone to view records'}
          </h3>

          {/* Add form */}
          {showAddForm && (
            <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '12px', alignItems: 'flex-end', marginBottom: '12px' }}>
                <TextInput id="add-name" labelText="Name" placeholder="web, mail 등" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Select id="add-type" labelText="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, data: '' }))}>
                  {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR'].map(t => <SelectItem key={t} value={t} text={t} />)}
                </Select>
                <TextInput id="add-data" labelText="Data" placeholder={PLACEHOLDERS[form.type] || ''} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button kind="secondary" onClick={() => { setShowAddForm(false); setEditRecord(null); }}>취소</Button>
                <Button kind="primary"  onClick={submitAdd}>{editRecord ? '변경' : '추가'}</Button>
              </div>
            </div>
          )}

          {/* Records DataTable */}
          {!selectedZone ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>좌측에서 DNS 존을 선택하세요</div>
          ) : recordsLoading ? (
            <InlineLoading description="Loading records..." />
          ) : records.length > 0 ? (
            <div style={{ border: '1px solid var(--cds-border-subtle-00)', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <DataTable rows={dnsRows} headers={dnsHeaders}>
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
                              style={
                                cell.info.header === 'name' || cell.info.header === 'data'
                                  ? { fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }
                                  : undefined
                              }
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
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '13px' }}>레코드가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
