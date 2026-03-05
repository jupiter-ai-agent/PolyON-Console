import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import {
  Button,
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
  Tag,
  Modal,
  InlineLoading,
  Pagination,
  TextInput,
  PasswordInput,
  NumberInput,
} from '@carbon/react';
import { Add, Renew, TrashCan, Edit } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, fmtBytes, extractErrorMessage, type Principal, type PrincipalPatch } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── 계정 추가/편집 모달 ────────────────────────────────────────────────────

function AccountModal({
  open,
  editAcc,
  onClose,
  onSaved,
}: {
  open: boolean;
  editAcc: Principal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editAcc === null;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [quotaMB, setQuotaMB] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isNew) { setName(''); setDesc(''); setEmail(''); setPassword(''); setQuotaMB(0); }
    else if (editAcc) {
      setName(editAcc.name ?? '');
      setDesc(editAcc.description ?? '');
      setEmail((editAcc.emails ?? [])[0] ?? '');
      setPassword('');
      setQuotaMB(Math.floor((editAcc.quota ?? 0) / 1048576));
    }
  }, [open, editAcc, isNew]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('사용자명을 입력하세요.'); return; }
    if (isNew && !password.trim()) { toast.error('비밀번호를 입력하세요.'); return; }
    setSaving(true);
    try {
      const emails = email.trim() ? [email.trim()] : [];
      if (isNew) {
        await mailApi.createPrincipal({
          type: 'individual', name: name.trim(),
          description: desc.trim() || name.trim(),
          secrets: [password], emails, roles: ['user'],
          quota: quotaMB * 1048576, memberOf: [], lists: [], members: [],
          enabledPermissions: [], disabledPermissions: [], externalMembers: [], urls: [],
        });
      } else if (editAcc) {
        const patches: PrincipalPatch[] = [];
        if (desc !== editAcc.description) patches.push({ action: 'set', field: 'description', value: desc });
        if (emails.join() !== (editAcc.emails ?? []).join()) patches.push({ action: 'set', field: 'emails', value: emails });
        if (password) patches.push({ action: 'addItem', field: 'secrets', value: password });
        patches.push({ action: 'set', field: 'quota', value: quotaMB * 1048576 });
        if (patches.length) await mailApi.updatePrincipal(editAcc.name ?? String(editAcc._id) ?? '', patches);
      }
      onSaved(); onClose();
      toast.success(isNew ? '계정이 생성되었습니다.' : '계정이 저장되었습니다.');
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={isNew ? '계정 추가' : '계정 편집'}
      primaryButtonText={saving ? '저장 중…' : isNew ? '생성' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSave}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={saving}
      size="sm"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextInput
          id="mail-account-name"
          labelText="사용자명 *"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="jane"
          disabled={!isNew}
        />
        <TextInput
          id="mail-account-desc"
          labelText="표시 이름"
          value={desc}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDesc(e.target.value)}
          placeholder="Jane Doe"
        />
        <TextInput
          id="mail-account-email"
          labelText="이메일"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="jane@example.com"
        />
        <PasswordInput
          id="mail-account-password"
          labelText={isNew ? '비밀번호 *' : '새 비밀번호 (변경 시에만)'}
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <NumberInput
          id="mail-account-quota"
          label="할당량 (MB, 0=무제한)"
          value={quotaMB}
          min={0}
          onChange={(_e: any, { value }: { value: number | string }) => setQuotaMB(Number(value) || 0)}
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
      modalHeading="계정 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      danger
      onRequestSubmit={onConfirm}
      onSecondarySubmit={onClose}
      size="xs"
    >
      <p>
        <strong>{target?.name}</strong> 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
      </p>
    </Modal>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

const BATCH_SIZE = 10;

async function loadQuotaDetails(ids: (string | number)[]): Promise<Principal[]> {
  const results: Principal[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((id) => mailApi.getPrincipal(String(id)).then((r) => r.data as Principal))
    );
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) results.push(s.value);
    }
  }
  return results;
}

export default function MailAccountsPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<Principal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Principal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, stalwartRes] = await Promise.allSettled([
        fetch('/api/v1/users').then((r) => r.json() as Promise<{ users?: { username?: string; mail?: string; given_name?: string; surname?: string; cn?: string }[] }>),
        mailApi.listPrincipals({ types: 'individual', limit: 500 }),
      ]);

      const adUsers = usersRes.status === 'fulfilled'
        ? (usersRes.value.users ?? []).filter((u) => u.mail?.includes('@'))
        : [];

      const quotaMap: Record<string, { quota?: number; usedQuota?: number }> = {};
      if (stalwartRes.status === 'fulfilled') {
        const rawItems = stalwartRes.value.data?.items ?? [];
        // If items are ID numbers/strings, fetch details in batches
        if (rawItems.length > 0 && typeof rawItems[0] !== 'object') {
          const details = await loadQuotaDetails(rawItems as (string | number)[]);
          for (const p of details) {
            if (p.name) quotaMap[p.name] = { quota: p.quota, usedQuota: p.usedQuota };
          }
        } else {
          for (const p of rawItems) {
            const pp = p as Principal;
            if (pp.name) quotaMap[pp.name] = { quota: pp.quota, usedQuota: pp.usedQuota };
          }
        }
      }

      const accs: Principal[] = adUsers.map((u) => ({
        _id: u.username,
        name: u.username,
        description: [u.given_name, u.surname].filter(Boolean).join(' ') || u.cn || u.username,
        emails: u.mail ? [u.mail] : [],
        type: 'individual',
        quota: quotaMap[u.username ?? '']?.quota ?? 0,
        usedQuota: quotaMap[u.username ?? '']?.usedQuota ?? 0,
      }));

      let filtered = accs;
      if (filterText) {
        const q = filterText.toLowerCase();
        filtered = accs.filter((a) =>
          (a.name ?? '').toLowerCase().includes(q) ||
          (a.emails ?? []).join(' ').toLowerCase().includes(q) ||
          (a.description ?? '').toLowerCase().includes(q)
        );
      }
      setTotal(filtered.length);
      const start = (page - 1) * pageSize;
      setAccounts(filtered.slice(start, start + pageSize));
    } catch (e) { toast.error('로딩 실패: ' + extractErrorMessage(e)); }
    setLoading(false);
  }, [page, pageSize, filterText]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await mailApi.deletePrincipal(deleteTarget.name ?? String(deleteTarget._id) ?? '');
      toast.success('계정이 삭제되었습니다.');
      await load();
    } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setDeleteTarget(null);
  };

  const headers = [
    { key: 'name', header: '사용자명' },
    { key: 'description', header: '표시 이름' },
    { key: 'email', header: '이메일' },
    { key: 'quota', header: '할당량' },
    { key: 'type', header: '유형' },
  ];

  const rows = accounts.map((a) => ({
    id: a.name ?? String(a._id),
    name: a.name ?? '—',
    description: a.description ?? '—',
    email: (a.emails ?? [])[0] ?? '—',
    quota: fmtBytes(a.quota),
    type: (a.roles ?? []).includes('admin') ? 'admin' : 'user',
  }));

  return (
    <>
      <PageHeader title="메일 계정" description="Stalwart 메일 계정 관리 — 생성, 편집, 삭제" />

      <DataTable rows={rows} headers={headers} size="sm">
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps, onInputChange }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e as Parameters<typeof onInputChange>[0]);
                    setFilterText(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                    setPage(1);
                  }}
                  placeholder="계정 검색…"
                  persistent
                />
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
                <Button size="sm" renderIcon={Add} onClick={() => { setEditAcc(null); setModalOpen(true); }}>계정 추가</Button>
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
                  <TableRow><TableCell colSpan={dtHeaders.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>등록된 계정이 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = accounts.find((a) => (a.name ?? String(a._id)) === row.id);
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ fontWeight: cell.info.header === 'name' ? 500 : undefined, fontFamily: cell.info.header === 'email' ? 'monospace' : undefined, fontSize: cell.info.header === 'email' ? 13 : undefined }}>
                          {cell.info.header === 'type' ? (
                            <Tag type={cell.value === 'admin' ? 'purple' : 'gray'} size="sm">
                              {cell.value === 'admin' ? '관리자' : '사용자'}
                            </Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button kind="ghost" size="sm" renderIcon={Edit} hasIconOnly iconDescription="편집"
                            onClick={() => { setEditAcc(orig ?? null); setModalOpen(true); }} />
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

      {total > pageSize && (
        <Pagination
          totalItems={total}
          pageSize={pageSize}
          page={page}
          pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
        />
      )}

      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>총 {total}건</div>

      <AccountModal
        open={modalOpen}
        editAcc={editAcc}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
      <DeleteModal
        open={deleteTarget !== null}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
