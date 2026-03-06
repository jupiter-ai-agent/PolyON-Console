// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  InlineNotification,
  SkeletonText,
  Modal,
  TextInput,
  Tag,
} from '@carbon/react';
import { Save, TrashCan, Renew, Reset } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { backupApi } from '../../api/backup';

function fmtSize(bytes) {
  if (!bytes || bytes === 0) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function fmtDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString('ko-KR'); } catch { return iso; }
}

function StatusTag({ status }) {
  const kindMap = { complete: 'green', running: 'blue', failed: 'red' };
  return <Tag type={kindMap[status] || 'gray'}>{status}</Tag>;
}

const headers = [
  { key: 'id', header: '백업 ID' },
  { key: 'tier', header: 'Tier' },
  { key: 'size', header: '크기' },
  { key: 'status', header: '상태' },
  { key: 'created_at', header: '생성일' },
  { key: 'actions', header: '' },
];

export default function SettingsBackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Restore modal state
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [adminPw, setAdminPw] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await backupApi.list();
      setBackups(data.backups || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStart() {
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await backupApi.start();
      setSuccess(`백업 시작됨 (ID: ${res.id})`);
      setTimeout(load, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`백업 ${id} 을(를) 삭제하시겠습니까?`)) return;
    try {
      await backupApi.remove(id);
      setSuccess('백업이 삭제되었습니다.');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRestore() {
    if (!restoreTarget || !adminPw) return;
    setRestoring(true);
    setRestoreError('');
    try {
      await backupApi.restore(restoreTarget.id, adminPw);
      setSuccess(`복원 시작됨 (ID: ${restoreTarget.id}). 서비스가 재시작됩니다.`);
      setRestoreTarget(null);
      setAdminPw('');
    } catch (e) {
      setRestoreError(e.message);
    } finally {
      setRestoring(false);
    }
  }

  const rows = backups.map((b) => ({
    id: b.id,
    tier: `Tier ${b.tier}`,
    size: fmtSize(b.size),
    status: <StatusTag status={b.status} />,
    created_at: fmtDate(b.created_at),
    actions: (
      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
        <Button
          kind="ghost"
         
          renderIcon={Reset}
          iconDescription="복원"
          hasIconOnly
          tooltipPosition="left"
          onClick={() => { setRestoreTarget(b); setAdminPw(''); setRestoreError(''); }}
        />
        <Button
          kind="danger--ghost"
         
          renderIcon={TrashCan}
          iconDescription="삭제"
          hasIconOnly
          tooltipPosition="left"
          onClick={() => handleDelete(b.id)}
        />
      </div>
    ),
  }));

  return (
    <>
      <PageHeader
        title="백업 관리"
        description="시스템 데이터를 백업하고 복원합니다"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button kind="ghost" renderIcon={Renew} onClick={load} disabled={loading}>
              새로고침
            </Button>
            <Button kind="primary" renderIcon={Save} onClick={handleStart} disabled={creating}>
              {creating ? '진행 중...' : '지금 백업'}
            </Button>
          </div>
        }
      />

      {error && (
        <InlineNotification
          kind="error"
          title="오류"
          subtitle={error}
          onCloseButtonClick={() => setError('')}
          style={{ margin: '1rem 0' }}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          title="완료"
          subtitle={success}
          onCloseButtonClick={() => setSuccess('')}
          style={{ margin: '1rem 0' }}
        />
      )}

      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <SkeletonText paragraph lines={5} />
        ) : backups.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem', padding: '3rem 0' }}>
            백업이 없습니다. 위 버튼을 눌러 첫 백업을 생성하세요.
          </p>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({ rows: tRows, headers: tHeaders, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tHeaders.map((h) => (
                        <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tRows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </div>

      {/* Restore confirm modal */}
      <Modal
        open={!!restoreTarget}
        danger
        modalHeading="시스템 복원"
        primaryButtonText={restoring ? '복원 중...' : '복원 시작'}
        secondaryButtonText="취소"
        primaryButtonDisabled={restoring || !adminPw}
        onRequestSubmit={handleRestore}
        onRequestClose={() => { setRestoreTarget(null); setAdminPw(''); setRestoreError(''); }}
      >
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          백업 <strong>{restoreTarget?.id}</strong> 으로 복원합니다. 현재 데이터가 덮어쓰여지며 서비스가 재시작됩니다.
          계속하려면 관리자 비밀번호를 입력하세요.
        </p>
        <TextInput
          id="restore-admin-pw"
          type="password"
          labelText="관리자 비밀번호"
          value={adminPw}
          onChange={(e) => setAdminPw(e.target.value)}
          invalid={!!restoreError}
          invalidText={restoreError}
        />
      </Modal>
    </>
  );
}
