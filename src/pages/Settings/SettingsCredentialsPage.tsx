// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
  Modal,
  PasswordInput,
  InlineNotification,
  SkeletonText,
  Tag,
} from '@carbon/react';
import { View, ViewOff, Edit, Warning } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

interface Service {
  id: string;
  name: string;
  port?: number;
  has_password: boolean;
  username?: string;
  password_masked?: string;
  editable?: boolean;
  note?: string;
  _revealed?: string;
}

export default function SettingsCredentialsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [editModal, setEditModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    setLoading(true);
    try {
      const data = await settingsApi.listCredentials();
      if (data.success) {
        setServices(data.services.filter(s => s.port && s.has_password && !['pgadmin', 'stalwart'].includes(s.id)));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function revealPassword(id: string) {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    if (svc._revealed) {
      setServices(prev => prev.map(s => s.id === id ? { ...s, _revealed: undefined } : s));
      return;
    }
    try {
      const res = await settingsApi.revealCredential(id);
      if (res.success) {
        setServices(prev => prev.map(s => s.id === id ? { ...s, _revealed: res.password } : s));
        setTimeout(() => {
          setServices(prev => prev.map(s => s.id === id ? { ...s, _revealed: undefined } : s));
        }, 10000);
      }
    } catch { /**/ }
  }

  function openEditModal(id: string, name: string) {
    setEditModal({ open: true, id, name });
    setNewPw('');
    setConfirmPw('');
    setPwError('');
  }

  async function savePassword() {
    setPwError('');
    if (newPw.length < 8) { setPwError('비밀번호는 최소 8자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { setPwError('비밀번호가 일치하지 않습니다.'); return; }
    setSaving(true);
    try {
      const res = await settingsApi.putCredentialPassword(editModal.id, newPw);
      if (res.success) {
        setEditModal({ open: false, id: '', name: '' });
        setToast(res.message || '비밀번호가 변경되었습니다.');
        loadServices();
      } else {
        setPwError(res.error || '변경 실패');
      }
    } catch (e) {
      setPwError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const headers = [
    { key: 'name', header: '서비스' },
    { key: 'username', header: '사용자' },
    { key: 'password', header: '비밀번호' },
    { key: 'actions', header: '' },
  ];

  const rows = services.map(s => ({
    id: s.id,
    name: s.name,
    username: s.username || '—',
    password: s._revealed ? s._revealed : (s.note || s.password_masked || '••••••••'),
    _service: s,
  }));

  return (
    <>
      <PageHeader
        title="서비스 인증 관리"
        description="PolyON 서비스의 관리자 계정 정보를 조회하고 변경합니다."
      />

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} onCloseButtonClick={() => setError('')} style={{ marginBottom: '1rem' }} />
      )}
      {toast && (
        <InlineNotification kind="success" title="완료" subtitle={toast} onCloseButtonClick={() => setToast('')} style={{ marginBottom: '1rem' }} />
      )}

      {loading ? (
        <SkeletonText paragraph lines={5} style={{ marginTop: '1.5rem' }} />
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows: r, headers: h, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()} style={{ marginTop: '1.5rem' }}>
              <TableHead>
                <TableRow>
                  {h.map(header => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {r.map(row => {
                  const svc: Service = (row.cells[0] as unknown as { value: string; row: { _service: Service } }).row._service
                    || services.find(s => s.id === row.id)!;
                  return (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      <TableCell>
                        <span style={{ fontWeight: 500 }}>{svc.name}</span>
                        {svc.port && <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>:{svc.port}</code>}
                      </TableCell>
                      <TableCell>
                        {svc.username ? <code>{svc.username}</code> : <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>}
                      </TableCell>
                      <TableCell>
                        {svc.note ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>{svc.note}</span>
                        ) : svc.has_password ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <code style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {svc._revealed ? svc._revealed : svc.password_masked}
                            </code>
                            <Button
                              kind="ghost"
                              size="sm"
                              hasIconOnly
                              renderIcon={svc._revealed ? ViewOff : View}
                              iconDescription={svc._revealed ? '숨기기' : '표시'}
                              onClick={() => revealPassword(svc.id)}
                            />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {svc.editable && (
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Edit}
                            onClick={() => openEditModal(svc.id, svc.name)}
                          >
                            변경
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}

      {/* Edit Modal */}
      <Modal
        open={editModal.open}
        modalHeading={`${editModal.name} 비밀번호 변경`}
        primaryButtonText={saving ? '변경 중...' : '변경'}
        secondaryButtonText="취소"
        onRequestSubmit={savePassword}
        onRequestClose={() => setEditModal({ open: false, id: '', name: '' })}
        primaryButtonDisabled={saving}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
          <PasswordInput
            id="newPw"
            labelText="새 비밀번호"
            placeholder="최소 8자"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />
          <PasswordInput
            id="confirmPw"
            labelText="비밀번호 확인"
            placeholder="동일하게 입력"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
          />
          {pwError && (
            <InlineNotification kind="error" title="" subtitle={pwError} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', background: 'var(--cds-layer-02)', padding: '0.75rem' }}>
            <Warning size={14} />
            비밀번호 변경 후 관련 서비스가 재시작될 수 있습니다.
          </div>
        </div>
      </Modal>
    </>
  );
}
