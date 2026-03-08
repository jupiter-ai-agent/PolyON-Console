import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, Tag, InlineNotification, TextInput, NumberInput,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableToolbar, TableToolbarContent, TableToolbarSearch,
  ComposedModal, ModalHeader, ModalBody, ModalFooter,
  OverflowMenu, OverflowMenuItem,
  DataTableSkeleton
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';

const BASE = '/api/v1/drive';

async function driveFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface GroupFolder {
  id: number;
  mount_point: string;
  groups: Record<string, number>;
  quota: number;
  size: number;
}

interface FolderFormData {
  name: string;
  group_id: string;
  quota_bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '무제한';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const headers = [
  { key: 'name', header: '폴더 이름' },
  { key: 'groups', header: '그룹' },
  { key: 'quota', header: '할당량' },
  { key: 'usage', header: '사용량' },
  { key: 'actions', header: '' },
];

export default function DriveFoldersPage() {
  const [folders, setFolders] = useState<GroupFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<string>('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  const [selectedFolder, setSelectedFolder] = useState<GroupFolder | null>(null);
  const [formData, setFormData] = useState<FolderFormData>({
    name: '',
    group_id: '',
    quota_bytes: 0,
  });
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await driveFetch<{ success: boolean; folders: GroupFolder[]; count: number }>('/folders');
      if (response.success) {
        setFolders(Array.isArray(response.folders) ? response.folders : []);
      } else {
        throw new Error('폴더 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.group_id.trim()) {
      setNotification({ type: 'error', text: '폴더 이름과 그룹 ID는 필수입니다.' });
      return;
    }

    setSubmitLoading(true);
    setNotification(null);

    try {
      await driveFetch('/folders', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      setNotification({ type: 'success', text: '팀 폴더가 성공적으로 생성되었습니다.' });
      setCreateModalOpen(false);
      setFormData({ name: '', group_id: '', quota_bytes: 0 });
      loadFolders();
    } catch (err) {
      setNotification({
        type: 'error',
        text: `폴더 생성 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleQuotaUpdate = async () => {
    if (!selectedFolder) return;

    setSubmitLoading(true);
    setNotification(null);

    try {
      await driveFetch(`/folders/${selectedFolder.id}/quota`, {
        method: 'PUT',
        body: JSON.stringify({ quota_bytes: formData.quota_bytes }),
      });
      
      setNotification({ type: 'success', text: '할당량이 성공적으로 변경되었습니다.' });
      setEditModalOpen(false);
      setSelectedFolder(null);
      loadFolders();
    } catch (err) {
      setNotification({
        type: 'error',
        text: `할당량 변경 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;

    setSubmitLoading(true);
    setNotification(null);

    try {
      await driveFetch(`/folders/${selectedFolder.id}`, {
        method: 'DELETE',
      });
      
      setNotification({ type: 'success', text: '팀 폴더가 성공적으로 삭제되었습니다.' });
      setDeleteModalOpen(false);
      setSelectedFolder(null);
      loadFolders();
    } catch (err) {
      setNotification({
        type: 'error',
        text: `폴더 삭제 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (folder: GroupFolder) => {
    setSelectedFolder(folder);
    setFormData({
      name: folder.mount_point,
      group_id: Object.keys(folder.groups)[0] || '',
      quota_bytes: folder.quota,
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (folder: GroupFolder) => {
    setSelectedFolder(folder);
    setDeleteModalOpen(true);
  };

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const filteredFolders = folders.filter(folder =>
    folder.mount_point.toLowerCase().includes(filter.toLowerCase())
  );

  const rows = filteredFolders.map((folder, i) => ({
    id: String(folder.id || i),
    name: folder.mount_point || '—',
    groups: Object.keys(folder.groups).join(', ') || '없음',
    quota: formatBytes(folder.quota),
    usage: (
      <div>
        <span style={{ fontSize: '0.875rem' }}>{formatBytes(folder.size)}</span>
        {folder.quota > 0 && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--cds-text-secondary)',
            marginTop: '2px'
          }}>
            {((folder.size / folder.quota) * 100).toFixed(1)}% 사용
          </div>
        )}
      </div>
    ),
    actions: (
      <OverflowMenu ariaLabel="더보기" size="sm">
        <OverflowMenuItem itemText="할당량 변경" onClick={() => openEditModal(folder)} />
        <OverflowMenuItem itemText="삭제" onClick={() => openDeleteModal(folder)} isDelete />
      </OverflowMenu>
    ),
  }));

  return (
    <>
      <PageHeader
        title="팀 폴더 관리"
        description="Nextcloud 팀 폴더 목록 및 관리"
      />

      {/* Notification */}
      {notification && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={notification.type}
            title={notification.type === 'success' ? '성공' : '오류'}
            subtitle={notification.text}
            onCloseButtonClick={() => setNotification(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="데이터 로딩 오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '1.5rem' }}>
          <DataTableSkeleton />
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          <DataTable rows={rows} headers={headers}>
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps, getTableContainerProps }) => (
              <div {...getTableContainerProps()}>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="폴더 검색..."
                      onChange={(event, value) => {
                        setFilter(value || '');
                      }}
                    />
                    <Button
                      kind="primary"
                      renderIcon={Add}
                      onClick={() => setCreateModalOpen(true)}
                    >
                      팀 폴더 생성
                    </Button>
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map(h => (
                        <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={headers.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--cds-text-secondary)' }}>
                          {filter ? '검색 결과가 없습니다.' : '팀 폴더가 없습니다.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map(row => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </DataTable>
        </div>
      )}

      {/* 폴더 생성 Modal */}
      <ComposedModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFormData({ name: '', group_id: '', quota_bytes: 0 });
        }}
      >
        <ModalHeader>
          <h3>팀 폴더 생성</h3>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput
              id="folder-name"
              labelText="폴더 이름 *"
              placeholder="팀 폴더 이름을 입력하세요"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextInput
              id="group-id"
              labelText="그룹 ID *"
              placeholder="그룹 ID를 입력하세요"
              value={formData.group_id}
              onChange={(e) => setFormData(prev => ({ ...prev, group_id: e.target.value }))}
            />
            <NumberInput
              id="quota"
              label="할당량 (바이트)"
              helperText="0은 무제한을 의미합니다"
              value={formData.quota_bytes}
              onChange={(e, { value }) => setFormData(prev => ({ ...prev, quota_bytes: Number(value) || 0 }))}
              min={0}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            kind="secondary"
            onClick={() => {
              setCreateModalOpen(false);
              setFormData({ name: '', group_id: '', quota_bytes: 0 });
            }}
          >
            취소
          </Button>
          <Button
            kind="primary"
            onClick={handleCreate}
            disabled={submitLoading}
          >
            {submitLoading ? '생성 중...' : '생성'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 할당량 변경 Modal */}
      <ComposedModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedFolder(null);
        }}
      >
        <ModalHeader>
          <h3>할당량 변경</h3>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--cds-text-secondary)' }}>
            {selectedFolder?.mount_point}
          </p>
        </ModalHeader>
        <ModalBody>
          <NumberInput
            id="edit-quota"
            label="새 할당량 (바이트)"
            helperText="0은 무제한을 의미합니다"
            value={formData.quota_bytes}
            onChange={(e, { value }) => setFormData(prev => ({ ...prev, quota_bytes: Number(value) || 0 }))}
            min={0}
          />
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f4f4f4', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              <strong>현재:</strong> {selectedFolder && formatBytes(selectedFolder.quota)}<br />
              <strong>사용량:</strong> {selectedFolder && formatBytes(selectedFolder.size)}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            kind="secondary"
            onClick={() => {
              setEditModalOpen(false);
              setSelectedFolder(null);
            }}
          >
            취소
          </Button>
          <Button
            kind="primary"
            onClick={handleQuotaUpdate}
            disabled={submitLoading}
          >
            {submitLoading ? '변경 중...' : '변경'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 삭제 확인 Modal */}
      <ComposedModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedFolder(null);
        }}
        danger
      >
        <ModalHeader>
          <h3>팀 폴더 삭제</h3>
        </ModalHeader>
        <ModalBody>
          <p>
            <strong>{selectedFolder?.mount_point}</strong> 폴더를 정말 삭제하시겠습니까?
          </p>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
            이 작업은 되돌릴 수 없으며, 폴더 내의 모든 파일이 삭제됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            kind="secondary"
            onClick={() => {
              setDeleteModalOpen(false);
              setSelectedFolder(null);
            }}
          >
            취소
          </Button>
          <Button
            kind="danger"
            onClick={handleDelete}
            disabled={submitLoading}
          >
            {submitLoading ? '삭제 중...' : '삭제'}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </>
  );
}