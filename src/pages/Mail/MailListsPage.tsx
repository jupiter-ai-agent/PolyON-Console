
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
import { Add, Renew, TrashCan, Edit } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, extractErrorMessage, type Principal, type PrincipalPatch } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── 리스트 편집 모달 ────────────────────────────────────────────────────────

function ListModal({
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
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState('');
  const [externalMembers, setExternalMembers] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isNew) {
      setName(''); setDesc(''); setEmail(''); setMembers(''); setExternalMembers('');
    } else if (editItem) {
      setName(editItem.name ?? '');
      setDesc(editItem.description ?? '');
      setEmail((editItem.emails ?? [])[0] ?? '');
      setMembers((editItem.members ?? []).join(', '));
      setExternalMembers((editItem.externalMembers ?? []).join(', '));
    }
  }, [open, editItem, isNew]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('리스트명을 입력하세요.'); return; }
    setSaving(true);
    try {
      const emails = email.trim() ? [email.trim()] : [];
      const memberList = members.split(',').map((s) => s.trim()).filter(Boolean);
      const extMemberList = externalMembers.split(',').map((s) => s.trim()).filter(Boolean);
      if (isNew) {
        await mailApi.createPrincipal({
          type: 'list',
          name: name.trim(),
          description: desc.trim() || name.trim(),
          emails,
          members: memberList,
          externalMembers: extMemberList,
          roles: [],
          lists: [],
          memberOf: [],
          quota: 0,
          enabledPermissions: [],
          disabledPermissions: [],
          urls: [],
        });
      } else if (editItem) {
        const patches: PrincipalPatch[] = [];
        if (desc !== editItem.description) patches.push({ action: 'set', field: 'description', value: desc });
        if (emails.join() !== (editItem.emails ?? []).join()) patches.push({ action: 'set', field: 'emails', value: emails });
        patches.push({ action: 'set', field: 'members', value: memberList });
        patches.push({ action: 'set', field: 'externalMembers', value: extMemberList });
        if (patches.length) await mailApi.updatePrincipal(editItem.name ?? editItem._id ?? '', patches);
      }
      onSaved(); onClose();
      toast.success(isNew ? '리스트가 생성되었습니다.' : '리스트가 저장되었습니다.');
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={isNew ? '메일링 리스트 추가' : '메일링 리스트 편집'}
      primaryButtonText={saving ? '저장 중…' : isNew ? '생성' : '저장'}
      secondaryButtonText="취소"
      onRequestSubmit={handleSave}
      onSecondarySubmit={onClose}
      primaryButtonDisabled={saving}
     
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextInput
          id="mail-list-name"
          labelText="리스트명 *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="newsletter"
          disabled={!isNew}
        />
        <TextInput
          id="mail-list-desc"
          labelText="표시 이름"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="뉴스레터 구독자"
        />
        <TextInput
          id="mail-list-email"
          labelText="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="newsletter@example.com"
        />
        <TextInput
          id="mail-list-members"
          labelText="내부 멤버 (쉼표 구분)"
          value={members}
          onChange={(e) => setMembers(e.target.value)}
          placeholder="alice, bob"
        />
        <TextInput
          id="mail-list-ext-members"
          labelText="외부 멤버 이메일 (쉼표 구분)"
          value={externalMembers}
          onChange={(e) => setExternalMembers(e.target.value)}
          placeholder="external@otherdomain.com"
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
      modalHeading="메일링 리스트 삭제"
      primaryButtonText="삭제"
      secondaryButtonText="취소"
      danger
      onRequestSubmit={onConfirm}
      onSecondarySubmit={onClose}
      size="xs"
    >
      <p>
        <strong>{target?.name}</strong> 리스트를 삭제하시겠습니까?
      </p>
    </Modal>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailListsPage() {
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
        types: 'list',
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
    try { await mailApi.deletePrincipal(deleteTarget.name ?? deleteTarget._id ?? ''); toast.success('리스트가 삭제되었습니다.'); await load(); } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setDeleteTarget(null);
  };

  const headers = [
    { key: 'name', header: '리스트명' },
    { key: 'description', header: '표시 이름' },
    { key: 'email', header: '이메일' },
    { key: 'memberCount', header: '멤버 수' },
    { key: 'extMemberCount', header: '외부 멤버' },
  ];

  const rows = items.map((l) => ({
    id: l.name ?? String(l._id),
    name: l.name ?? '—',
    description: l.description ?? '—',
    email: (l.emails ?? [])[0] ?? '—',
    memberCount: (l.members ?? []).length,
    extMemberCount: (l.externalMembers ?? []).length,
  }));

  return (
    <>
      <PageHeader title="메일링 리스트" description="Stalwart 메일링 리스트 관리 — 내부·외부 구독자 관리" />

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
                  placeholder="리스트 검색…"
                />
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
                <Button renderIcon={Add} onClick={() => { setEditItem(null); setModalOpen(true); }}>리스트 추가</Button>
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
                  <TableRow><TableCell colSpan={dtHeaders.length + 1} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>등록된 메일링 리스트가 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => {
                  const orig = items.find((l) => (l.name ?? String(l._id)) === row.id);
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}
                          style={{
                            fontWeight: cell.info.header === 'name' ? 500 : undefined,
                            fontFamily: cell.info.header === 'email' ? 'monospace' : undefined,
                            fontSize: cell.info.header === 'email' ? 13 : undefined,
                          }}>
                          {cell.info.header === 'memberCount' ? (
                            <Tag type="blue">{cell.value}명</Tag>
                          ) : cell.info.header === 'extMemberCount' ? (
                            <Tag type="teal">{cell.value}명</Tag>
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

      <ListModal
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
