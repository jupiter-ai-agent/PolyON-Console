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
  InlineNotification,
  TextInput,
  TextArea,
} from '@carbon/react';
import { Renew, Edit, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, parseSettingsItems, extractErrorMessage } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

const PREFIXES = ['', 'server', 'authentication', 'directory', 'imap', 'smtp', 'jmap', 'sieve', 'storage', 'certificate', 'spam-filter', 'security'];

export default function MailConfigPage() {
  const toast = useToast();
  const [items, setItems] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [filterText, setFilterText] = useState('');
  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState<{ kind: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await mailApi.getSettings(prefix);
      setItems(parseSettingsItems(r.data ?? {}));
    } catch (e) { toast.error('로딩 실패: ' + extractErrorMessage(e)); }
    setLoading(false);
  }, [prefix]);

  useEffect(() => { load(); }, [load]);

  const handleReload = async () => {
    setReloading(true);
    try {
      const r = await mailApi.reloadSettings();
      const data = r.data ?? {};
      const errors = data.errors ? Object.keys(data.errors).length : 0;
      const warnings = data.warnings ? Object.keys(data.warnings).length : 0;
      if (errors > 0) setReloadMsg({ kind: 'error', text: `리로드 오류: ${errors}건` });
      else if (warnings > 0) setReloadMsg({ kind: 'warning', text: `리로드 완료 (${warnings}개 경고)` });
      else setReloadMsg({ kind: 'success', text: '설정 리로드 완료' });
      await load();
    } catch (e: unknown) { setReloadMsg({ kind: 'error', text: `리로드 실패: ${(e as Error).message}` }); }
    setReloading(false);
  };

  const openEdit = (key: string, value: string) => {
    setEditKey(key); setEditValue(value); setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await mailApi.updateSetting(editKey, editValue);
      toast.success('설정이 저장되었습니다.');
      await load(); setEditOpen(false);
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    setSaving(true);
    try {
      await mailApi.deleteSetting(editKey);
      toast.success('설정이 삭제되었습니다.');
      await load(); setEditOpen(false);
    } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  const filtered = filterText
    ? items.filter(([k, v]) => k.toLowerCase().includes(filterText.toLowerCase()) || String(v).toLowerCase().includes(filterText.toLowerCase()))
    : items;
  const shown = filtered.slice(0, 200);

  const headers = [
    { key: 'key', header: '키' },
    { key: 'value', header: '값' },
  ];
  const rows = shown.map(([k, v]) => ({ id: k, key: k, value: String(v) }));

  return (
    <>
      <PageHeader title="서버 설정" description="Stalwart 서버 설정값 검색, 조회, 편집" />

      {reloadMsg && (
        <InlineNotification
          kind={reloadMsg.kind}
          title={reloadMsg.text}
          style={{ marginBottom: 16 }}
          onCloseButtonClick={() => setReloadMsg(null)}
        />
      )}

      {/* 프리픽스 필터 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {PREFIXES.map((p) => (
          <Button
            key={p || 'all'}
            kind={p === prefix ? 'primary' : 'ghost'}
           
            onClick={() => setPrefix(p)}
            style={{ fontSize: 12, fontWeight: p === prefix ? 600 : 400 }}
          >
            {p || '전체'}
          </Button>
        ))}
      </div>

      <DataTable rows={rows} headers={headers}>
        {({ rows: dtRows, headers: dtHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps, onInputChange }) => (
          <>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={(e) => {
                    if (typeof onInputChange === 'function') onInputChange(e);
                    setFilterText(typeof e === 'string' ? e : (e.target as HTMLInputElement).value);
                  }}
                  placeholder="설정 키 검색… (예: server.hostname)"
                />
                <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="새로고침" onClick={load} tooltipPosition="bottom" />
                <Button kind="ghost" onClick={handleReload} disabled={reloading}>
                  {reloading ? '리로드 중…' : '설정 리로드'}
                </Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                  <TableHeader style={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3}><InlineLoading description="로딩 중…" /></TableCell></TableRow>
                ) : dtRows.length === 0 ? (
                  <TableRow><TableCell colSpan={3} style={{ textAlign: 'center', padding: 32, color: 'var(--cds-text-secondary)' }}>설정값이 없습니다</TableCell></TableRow>
                ) : dtRows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id} style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: cell.info.header === 'key' ? 500 : undefined, wordBreak: 'break-all', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(cell.value)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        kind="ghost" renderIcon={Edit} hasIconOnly iconDescription="편집"
                        onClick={() => { const entry = items.find(([k]) => k === row.id); if (entry) openEdit(entry[0], entry[1]); }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DataTable>

      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--cds-text-secondary)' }}>
        {shown.length}건 표시{filtered.length > 200 ? ` (전체 ${filtered.length})` : ''}
      </div>

      {/* 편집 모달 */}
      <Modal
        open={editOpen}
        onRequestClose={() => setEditOpen(false)}
        modalHeading="설정 편집"
        primaryButtonText={saving ? '저장 중…' : '저장'}
        secondaryButtonText="삭제"
        onRequestSubmit={handleSave}
        onSecondarySubmit={() => setDeleteConfirmOpen(true)}
        primaryButtonDisabled={saving}
       
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>키</div>
            <TextInput id="edit-key" labelText="" value={editKey} disabled style={{ fontFamily: 'monospace' }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>값</div>
            <TextArea
              id="edit-value"
              labelText=""
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={5}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        onRequestClose={() => setDeleteConfirmOpen(false)}
        modalHeading="설정 삭제"
        primaryButtonText="삭제"
        secondaryButtonText="취소"
        danger
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setDeleteConfirmOpen(false)}
        size="xs"
      >
        <p><strong>{editKey}</strong> 설정을 삭제하시겠습니까?</p>
      </Modal>
    </>
  );
}
