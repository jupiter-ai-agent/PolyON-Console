import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, Tag, InlineNotification, TextInput, TextArea, RadioButtonGroup, RadioButton,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableToolbar, TableToolbarContent, TableToolbarSearch,
  ComposedModal, ModalHeader, ModalBody, ModalFooter,
  OverflowMenu, OverflowMenuItem,
  DataTableSkeleton
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

async function chatFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const { getToken } = await import('../../api/client');
  const token = getToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface Team {
  id: string;
  name: string;
  display_name: string;
  type: 'O' | 'I';
  member_count?: number;
  description?: string;
  create_at?: number;
}

interface TeamFormData {
  name: string;
  display_name: string;
  type: 'O' | 'I';
  description: string;
}

const headers = [
  { key: 'name', header: '팀 이름' },
  { key: 'displayName', header: '표시 이름' },
  { key: 'type', header: '유형' },
  { key: 'memberCount', header: '멤버 수' },
  { key: 'description', header: '설명' },
  { key: 'actions', header: '작업' },
];

export default function ChatTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form state
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    display_name: '',
    type: 'O',
    description: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error'; 
    title: string; 
    subtitle: string 
  } | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatFetch<Team[]>('/teams');
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '팀 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filteredTeams = teams.filter(team =>
    !searchQuery ||
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      type: 'O',
      description: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModal(true);
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      display_name: team.display_name,
      type: team.type,
      description: team.description || ''
    });
    setEditModal(true);
  };

  const openDeleteModal = (team: Team) => {
    setSelectedTeam(team);
    setDeleteModal(true);
  };

  const handleCreateTeam = async () => {
    setFormLoading(true);
    try {
      await chatFetch('/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          display_name: formData.display_name,
          type: formData.type,
          description: formData.description || undefined
        })
      });
      
      setNotification({
        type: 'success',
        title: '팀 생성 완료',
        subtitle: `팀 "${formData.display_name}"이 성공적으로 생성되었습니다.`
      });
      
      setCreateModal(false);
      resetForm();
      await loadTeams();
    } catch (err) {
      setNotification({
        type: 'error',
        title: '팀 생성 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam) return;
    
    setFormLoading(true);
    try {
      await chatFetch(`/teams/${selectedTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          display_name: formData.display_name,
          type: formData.type,
          description: formData.description || undefined
        })
      });
      
      setNotification({
        type: 'success',
        title: '팀 수정 완료',
        subtitle: `팀 "${formData.display_name}"이 성공적으로 수정되었습니다.`
      });
      
      setEditModal(false);
      setSelectedTeam(null);
      resetForm();
      await loadTeams();
    } catch (err) {
      setNotification({
        type: 'error',
        title: '팀 수정 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    
    setFormLoading(true);
    try {
      await chatFetch(`/teams/${selectedTeam.id}`, {
        method: 'DELETE'
      });
      
      setNotification({
        type: 'success',
        title: '팀 삭제 완료',
        subtitle: `팀 "${selectedTeam.display_name}"이 성공적으로 삭제되었습니다.`
      });
      
      setDeleteModal(false);
      setSelectedTeam(null);
      await loadTeams();
    } catch (err) {
      setNotification({
        type: 'error',
        title: '팀 삭제 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    return formData.name.trim() && formData.display_name.trim();
  };

  const rows = filteredTeams.map(team => ({
    id: team.id,
    name: team.name,
    displayName: team.display_name,
    type: (
      <Tag type={team.type === 'O' ? 'blue' : 'gray'}>
        {team.type === 'O' ? '공개' : '초대전용'}
      </Tag>
    ),
    memberCount: team.member_count ?? '—',
    description: team.description || '—',
    actions: (
      <OverflowMenu>
        <OverflowMenuItem itemText="수정" onClick={() => openEditModal(team)} />
        <OverflowMenuItem 
          itemText="삭제" 
          isDelete 
          onClick={() => openDeleteModal(team)} 
        />
      </OverflowMenu>
    )
  }));

  return (
    <>
      <PageHeader
        title="팀 관리"
        description="Mattermost 팀 목록 및 관리"
        actions={
          <Button
            kind="primary"
            renderIcon={Add}
            onClick={openCreateModal}
          >
            팀 생성
          </Button>
        }
      />

      {/* Notification */}
      {notification && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={notification.type}
            title={notification.title}
            subtitle={notification.subtitle}
            onCloseButtonClick={() => setNotification(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="로딩 오류"
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
        <div style={{ marginTop: '1.5rem' }}>
          <DataTable rows={rows} headers={headers}>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableProps,
              getHeaderProps,
              getRowProps,
              onInputChange
            }) => (
              <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="팀 이름으로 검색..."
                      onChange={(event, value) => {
                        setSearchQuery(value || '');
                      }}
                    />
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
                        <TableCell colSpan={headers.length}>
                          <div style={{ 
                            padding: '3rem', 
                            textAlign: 'center', 
                            color: 'var(--cds-text-secondary)' 
                          }}>
                            {searchQuery ? '검색 결과가 없습니다.' : '팀이 없습니다.'}
                          </div>
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

      {/* 팀 생성 모달 */}
      <ComposedModal open={createModal} onClose={() => setCreateModal(false)}>
        <ModalHeader title="팀 생성" />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput
              id="team-name"
              labelText="팀 이름"
              placeholder="영문소문자, 하이픈만 허용"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              helperText="URL에서 사용되는 고유한 식별자입니다."
            />
            
            <TextInput
              id="team-display-name"
              labelText="표시 이름"
              placeholder="사용자에게 보여질 팀 이름"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            />
            
            <RadioButtonGroup
              legendText="팀 유형"
              name="team-type"
              value={formData.type}
              onChange={(value) => setFormData(prev => ({ ...prev, type: value as 'O' | 'I' }))}
            >
              <RadioButton id="type-open" labelText="공개 (모든 사용자가 참여 가능)" value="O" />
              <RadioButton id="type-invite" labelText="초대전용 (관리자 승인 필요)" value="I" />
            </RadioButtonGroup>
            
            <TextArea
              id="team-description"
              labelText="설명 (선택사항)"
              placeholder="팀에 대한 설명을 입력하세요"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateModal(false)}>
            취소
          </Button>
          <Button 
            kind="primary" 
            onClick={handleCreateTeam}
            disabled={!validateForm() || formLoading}
          >
            {formLoading ? '생성 중...' : '팀 생성'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 팀 수정 모달 */}
      <ComposedModal open={editModal} onClose={() => setEditModal(false)}>
        <ModalHeader title="팀 수정" />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput
              id="edit-team-name"
              labelText="팀 이름"
              placeholder="영문소문자, 하이픈만 허용"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              helperText="URL에서 사용되는 고유한 식별자입니다."
            />
            
            <TextInput
              id="edit-team-display-name"
              labelText="표시 이름"
              placeholder="사용자에게 보여질 팀 이름"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            />
            
            <RadioButtonGroup
              legendText="팀 유형"
              name="edit-team-type"
              value={formData.type}
              onChange={(value) => setFormData(prev => ({ ...prev, type: value as 'O' | 'I' }))}
            >
              <RadioButton id="edit-type-open" labelText="공개 (모든 사용자가 참여 가능)" value="O" />
              <RadioButton id="edit-type-invite" labelText="초대전용 (관리자 승인 필요)" value="I" />
            </RadioButtonGroup>
            
            <TextArea
              id="edit-team-description"
              labelText="설명 (선택사항)"
              placeholder="팀에 대한 설명을 입력하세요"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setEditModal(false)}>
            취소
          </Button>
          <Button 
            kind="primary" 
            onClick={handleEditTeam}
            disabled={!validateForm() || formLoading}
          >
            {formLoading ? '수정 중...' : '수정 완료'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 팀 삭제 확인 모달 */}
      <ComposedModal open={deleteModal} onClose={() => setDeleteModal(false)}>
        <ModalHeader title="팀 삭제 확인" />
        <ModalBody>
          <p>정말로 이 팀을 삭제하시겠습니까?</p>
          {selectedTeam && (
            <div style={{ 
              background: '#f4f4f4', 
              border: '1px solid #e0e0e0', 
              padding: '1rem', 
              marginTop: '1rem',
              borderRadius: '4px'
            }}>
              <strong>팀 이름:</strong> {selectedTeam.display_name} ({selectedTeam.name})
              <br />
              <strong>유형:</strong> {selectedTeam.type === 'O' ? '공개' : '초대전용'}
              {selectedTeam.member_count !== undefined && (
                <>
                  <br />
                  <strong>멤버 수:</strong> {selectedTeam.member_count}
                </>
              )}
            </div>
          )}
          <p style={{ color: '#da1e28', marginTop: '1rem' }}>
            <strong>주의:</strong> 이 작업은 되돌릴 수 없습니다. 팀과 관련된 모든 데이터가 삭제됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setDeleteModal(false)}>
            취소
          </Button>
          <Button 
            kind="danger" 
            onClick={handleDeleteTeam}
            disabled={formLoading}
          >
            {formLoading ? '삭제 중...' : '삭제 확인'}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </>
  );
}