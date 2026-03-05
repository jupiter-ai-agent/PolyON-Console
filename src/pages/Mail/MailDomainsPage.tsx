import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import {
  Button,
  Checkbox,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Modal,
  InlineLoading,
  TextInput,
  TextArea,
} from '@carbon/react';
import { Add, Renew, TrashCan, Key, Edit } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, extractErrorMessage, type Principal, type PrincipalPatch } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── DKIM 결과 모달 ──────────────────────────────────────────────────────────

function DkimResultModal({
  open,
  result,
  domainName,
  onClose,
}: {
  open: boolean;
  result: string | null;
  domainName: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={`DKIM 키 생성 — ${domainName}`}
      passiveModal
      size="lg"
    >
      {result !== null ? (
        <div>
          <p style={{ marginBottom: 12 }}>
            도메인 <strong>{domainName}</strong>의 DKIM 키가 생성되었습니다.
          </p>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
              DNS TXT 레코드 (아래 값을 DNS에 추가하세요)
            </div>
            <TextArea
              id="dkim-result"
              labelText=""
              readOnly
              value={result}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          </div>
        </div>
      ) : (
        <InlineLoading description="생성 중…" />
      )}
    </Modal>
  );
}

// ── 도메인 추가 모달 ────────────────────────────────────────────────────────

function AddDomainModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (steps?: unknown[]) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [mailhost, setMailhost] = useState('');
  const [autoprovision, setAutoprovision] = useState(true);
  const [creating, setCreating] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ status: string; detail: string }[] | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('도메인명을 입력하세요.'); return; }
    setCreating(true);
    try {
      if (autoprovision) {
        const res = await fetch('/api/v1/mail/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: name.trim(), mail_hostname: mailhost.trim() || `mail.${name.trim()}`, create_postmaster: true }),
        });
        const data = await res.json() as { success?: boolean; steps?: { status: string; detail: string }[] };
        setProvisionResult(data.steps ?? null);
        onCreated(data.steps);
      } else {
        await mailApi.createPrincipal({
          type: 'domain', name: name.trim(), description: name.trim(),
          quota: 0, secrets: [], emails: [], urls: [], memberOf: [], roles: [],
          lists: [], members: [], enabledPermissions: [], disabledPermissions: [], externalMembers: [],
        });
        toast.success('도메인이 추가되었습니다.');
        onClose();
        onCreated();
      }
    } catch (e) { toast.error('추가 실패: ' + extractErrorMessage(e)); }
    setCreating(false);
  };

  const statusIcon = (s: string) => {
    if (s === 'ok') return '✓';
    if (s === 'skip') return '○';
    return '✗';
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="도메인 추가"
      primaryButtonText={creating ? '추가 중…' : '추가'}
      secondaryButtonText="취소"
      onRequestSubmit={handleCreate}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={creating}
      size="md"
    >
      {provisionResult !== null ? (
        <div>
          <p style={{ marginBottom: 12, fontWeight: 600 }}>도메인 자동 구성 결과</p>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {provisionResult.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ color: s.status === 'ok' ? 'var(--cds-support-success)' : s.status === 'skip' ? 'var(--cds-text-secondary)' : 'var(--cds-support-error)' }}>
                  {statusIcon(s.status)}
                </span>
                <span>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
              도메인명 <span style={{ color: 'var(--cds-support-error)' }}>*</span>
            </div>
            <TextInput
              id="domain-name"
              labelText=""
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="example.com"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>메일 호스트명</div>
            <TextInput
              id="domain-mailhost"
              labelText=""
              value={mailhost}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMailhost(e.target.value)}
              placeholder="mail.example.com"
            />
            <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>비워두면 mail.{'{도메인}'}으로 자동 설정</p>
          </div>
          <Checkbox
            id="domain-autoprovision"
            labelText={
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>DNS + DKIM 자동 구성</div>
                <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                  AD DNS에 MX, SPF, DKIM, DMARC, SRV, autoconfig 레코드를 자동 생성합니다.
                </p>
              </div>
            }
            checked={autoprovision}
            onChange={(_: ChangeEvent<HTMLInputElement>, { checked }: { checked: boolean }) => setAutoprovision(checked)}
          />
        </div>
      )}
    </Modal>
  );
}

// ── 도메인 편집 모달 ────────────────────────────────────────────────────────

function EditDomainModal({
  open,
  domain,
  onClose,
  onSaved,
}: {
  open: boolean;
  domain: Principal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && domain) setDesc(domain.description ?? '');
  }, [open, domain]);

  const handleSave = async () => {
    if (!domain) return;
    setSaving(true);
    try {
      const patches: PrincipalPatch[] = [{ action: 'set', field: 'description', value: desc }];
      await mailApi.updatePrincipal(domain.name ?? String(domain._id), patches);
      toast.success('도메인 정보가 저장되었습니다.');
      onSaved(); onClose();
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={`도메인 편집 — ${domain?.name ?? ''}`}
      primaryButtonText={saving ? '저장 중…' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSave}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={saving}
      size="sm"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextInput
          id="domain-edit-name"
          labelText="도메인명"
          value={domain?.name ?? ''}
          disabled
        />
        <TextInput
          id="domain-edit-desc"
          labelText="설명"
          value={desc}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDesc(e.target.value)}
          placeholder="도메인 설명"
        />
      </div>
    </Modal>
  );
}

// ── 삭제 확인 모달 ────────────────────────────────────────────────────────

function DeleteModal({
  open,
  target,
  onClose,
  onConfirm,
}: {
  open: boolean;
  target: Principal | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="도메인 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      danger
      onRequestSubmit={onConfirm}
      onSecondarySubmit={onClose}
      size="xs"
    >
      <p>
        <strong>{target?.name}</strong> 도메인을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </p>
    </Modal>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailDomainsPage() {
  const toast = useToast();
  const [domains, setDomains] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Principal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Principal | null>(null);
  const [dkimOpen, setDkimOpen] = useState(false);
  const [dkimResult, setDkimResult] = useState<string | null>(null);
  const [dkimDomain, setDkimDomain] = useState('');
  const [filterText, setFilterText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listPrincipals({ types: 'domain', limit: 100 });
      const items = r.data?.items ?? [];
      const details: Principal[] = [];
      for (const item of items) {
        const lookupKey = typeof item === 'object' && (item as Principal).name
          ? (item as Principal).name!
          : String(item);
        try {
          const dr = await mailApi.getPrincipal(lookupKey);
          details.push({ ...((dr.data ?? {}) as Principal), _id: lookupKey });
        } catch {
          details.push({ _id: lookupKey, name: lookupKey, type: 'domain' });
        }
      }
      setDomains(details);
    } catch (e) { toast.error('로딩 실패: ' + extractErrorMessage(e)); }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mailApi.deletePrincipal(deleteTarget.name ?? String(deleteTarget._id));
      toast.success('도메인이 삭제되었습니다.');
      await load();
    } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setDeleteTarget(null);
  };

  const handleDkim = async (domainName: string) => {
    setDkimDomain(domainName);
    setDkimResult(null);
    setDkimOpen(true);
    try {
      const r = await mailApi.createDKIM(domainName);
      const data = r.data;
      setDkimResult(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      setDkimResult(`오류: ${extractErrorMessage(e)}`);
    }
  };

  const filtered = filterText
    ? domains.filter((d) => (d.name ?? '').toLowerCase().includes(filterText.toLowerCase()))
    : domains;

  const headers = [
    { key: 'name', header: '도메인' },
    { key: 'description', header: '설명' },
    { key: 'dkim', header: 'DKIM' },
  ];

  const rows = filtered.map((d) => ({
    id: d.name ?? String(d._id),
    name: d.name ?? '—',
    description: d.description ?? '—',
    dkim: d.name ?? '',
  }));

  return (
    <>
      <PageHeader title="메일 도메인" description="도메인 등록 및 DKIM 키 관리" />

      <DataTable rows={rows} headers={headers} size="sm">
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps, onInputChange }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e as Parameters<typeof onInputChange>[0]);
                    setFilterText(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                  }}
                  placeholder="도메인 검색…"
                  persistent
                />
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
                <Button size="sm" renderIcon={Add} onClick={() => setAddOpen(true)}>도메인 추가</Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={dtHeaders.length + 1}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={dtHeaders.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>등록된 도메인이 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = domains.find((d) => (d.name ?? String(d._id)) === row.id);
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ fontWeight: cell.info.header === 'name' ? 500 : undefined }}>
                          {cell.info.header === 'dkim' ? (
                            <Button
                              kind="ghost"
                              size="sm"
                              renderIcon={Key}
                              onClick={() => handleDkim(String(cell.value))}
                            >
                              DKIM 생성
                            </Button>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button kind="ghost" size="sm" renderIcon={Edit} hasIconOnly iconDescription="편집"
                            onClick={() => orig && setEditTarget(orig)} />
                          <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} hasIconOnly iconDescription="삭제"
                            onClick={() => orig && setDeleteTarget(orig)} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>

      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>
        총 {filtered.length}건
      </div>

      <AddDomainModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => { setAddOpen(false); load(); }}
      />

      <EditDomainModal
        open={editTarget !== null}
        domain={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />

      <DeleteModal
        open={deleteTarget !== null}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <DkimResultModal
        open={dkimOpen}
        result={dkimResult}
        domainName={dkimDomain}
        onClose={() => setDkimOpen(false)}
      />
    </>
  );
}
