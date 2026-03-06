
import { useEffect, useState, useCallback } from 'react';
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
} from '@carbon/react';
import { Add, Renew, TrashCan, Edit, Copy } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, extractErrorMessage, type Principal, type PrincipalPatch } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── API 키 편집 모달 ──────────────────────────────────────────────────────

function ApiKeyModal({
  open,
  editItem,
  onClose,
  onSaved,
}: {
  open: boolean;
  editItem: Principal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editItem === null;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [key, setKey] = useState('');
  const [enabledPerms, setEnabledPerms] = useState('');
  const [disabledPerms, setDisabledPerms] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isNew) {
      setName(''); setDesc(''); setKey(''); setEnabledPerms(''); setDisabledPerms('');
    } else if (editItem) {
      setName(editItem.name ?? '');
      setDesc(editItem.description ?? '');
      setKey((editItem.emails ?? [])[0] ?? '');
      setEnabledPerms((editItem.enabledPermissions ?? []).join(', '));
      setDisabledPerms((editItem.disabledPermissions ?? []).join(', '));
    }
  }, [open, editItem, isNew]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('API 키 이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      const enabledList = enabledPerms.split(',').map((s) => s.trim()).filter(Boolean);
      const disabledList = disabledPerms.split(',').map((s) => s.trim()).filter(Boolean);
      const emails = key.trim() ? [key.trim()] : [];
      if (isNew) {
        await mailApi.createPrincipal({
          type: 'api-key',
          name: name.trim(),
          description: desc.trim() || name.trim(),
          emails,
          enabledPermissions: enabledList,
          disabledPermissions: disabledList,
          roles: [],
          lists: [],
          memberOf: [],
          members: [],
          quota: 0,
          externalMembers: [],
          urls: [],
        });
      } else if (editItem) {
        const patches: PrincipalPatch[] = [];
        if (desc !== editItem.description) patches.push({ action: 'set', field: 'description', value: desc });
        if (emails.join() !== (editItem.emails ?? []).join()) patches.push({ action: 'set', field: 'emails', value: emails });
        patches.push({ action: 'set', field: 'enabledPermissions', value: enabledList });
        patches.push({ action: 'set', field: 'disabledPermissions', value: disabledList });
        if (patches.length) await mailApi.updatePrincipal(editItem.name ?? editItem._id ?? '', patches);
      }
      onSaved(); onClose();
      toast.success(isNew ? 'API 키가 생성되었습니다.' : 'API 키가 저장되었습니다.');
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={isNew ? 'API 키 추가' : 'API 키 편집'}
      primaryButtonText={saving ? '저장 중…' : isNew ? '생성' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSave}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={saving}
     
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextInput
          id="mail-apikey-name"
          labelText="키 이름 *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-api-key"
          disabled={!isNew}
        />
        <TextInput
          id="mail-apikey-desc"
          labelText="설명"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="외부 앱 통합용 키"
        />
        <TextInput
          id="mail-apikey-key"
          labelText="API 키 값 (비워두면 자동 생성)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-..."
        />
        <TextInput
          id="mail-apikey-enabled-perms"
          labelText="허용 권한 (쉼표 구분)"
          value={enabledPerms}
          onChange={(e) => setEnabledPerms(e.target.value)}
          placeholder="imap-authenticate, smtp-send-message"
        />
        <TextInput
          id="mail-apikey-disabled-perms"
          labelText="금지 권한 (쉼표 구분)"
          value={disabledPerms}
          onChange={(e) => setDisabledPerms(e.target.value)}
          placeholder="dav-access"
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
      modalHeading="API 키 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      danger
      onRequestSubmit={onConfirm}
      onSecondarySubmit={onClose}
      size="xs"
    >
      <p>
        <strong>{target?.name}</strong> API 키를 삭제하시겠습니까? 이 키를 사용하는 모든 앱이 인증에 실패합니다.
      </p>
    </Modal>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailApiKeysPage() {
  const toast = useToast();
  const [items, setItems] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Principal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Principal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.listPrincipals({
        types: 'api-key',
        limit: pageSize,
        page,
        filter: filterText || undefined,
      });
      setItems(r.data?.items as Principal[] ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (e) { toast.error('로딩 실패: ' + extractErrorMessage(e)); }
    setLoading(false);
  }, [page, pageSize, filterText]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await mailApi.deletePrincipal(deleteTarget.name ?? deleteTarget._id ?? ''); toast.success('API 키가 삭제되었습니다.'); await load(); } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setDeleteTarget(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => null);
  };

  const headers = [
    { key: 'name', header: '키 이름' },
    { key: 'description', header: '설명' },
    { key: 'keyValue', header: 'API 키' },
    { key: 'permsCount', header: '권한 수' },
  ];

  const rows = items.map((k) => ({
    id: k.name ?? String(k._id),
    name: k.name ?? '—',
    description: k.description ?? '—',
    keyValue: (k.emails ?? [])[0] ?? '—',
    permsCount: (k.enabledPermissions ?? []).length,
  }));

  return (
    <>
      <PageHeader title="API 키 관리" description="Stalwart API 키 관리 — 외부 앱 인증 토큰" />

      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps, onInputChange }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e);
                    setFilterText(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                    setPage(1);
                  }}
                  placeholder="API 키 검색…"
                />
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
                <Button renderIcon={Add} onClick={() => { setEditItem(null); setModalOpen(true); }}>키 추가</Button>
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
                  <TableRow><TableCell colSpan={dtHeaders.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>등록된 API 키가 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items.find((k) => (k.name ?? String(k._id)) === row.id);
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id} style={{ fontWeight: cell.info.header === 'name' ? 500 : undefined }}>
                          {cell.info.header === 'keyValue' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <code style={{ fontSize: 11, background: 'var(--cds-layer-02)', padding: '2px 6px', borderRadius: 2 }}>
                                {String(cell.value).length > 20 ? String(cell.value).slice(0, 20) + '…' : String(cell.value)}
                              </code>
                              {String(cell.value) !== '—' && (
                                <Button kind="ghost" renderIcon={Copy} hasIconOnly iconDescription="복사"
                                  onClick={() => handleCopy(String(cell.value))} />
                              )}
                            </div>
                          ) : cell.info.header === 'permsCount' ? (
                            <Tag type="blue">{cell.value}개</Tag>
                          ) : String(cell.value)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button kind="ghost" renderIcon={Edit} hasIconOnly iconDescription="편집"
                            onClick={() => { setEditItem(orig ?? null); setModalOpen(true); }} />
                          <Button kind="danger--ghost" renderIcon={TrashCan} hasIconOnly iconDescription="삭제"
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

      <ApiKeyModal
        open={modalOpen}
        editItem={editItem}
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
