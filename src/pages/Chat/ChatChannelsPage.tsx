import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, Tag, InlineNotification, TextInput, TextArea, RadioButtonGroup, RadioButton, Dropdown,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell, TableToolbar, TableToolbarContent, TableToolbarSearch,
  ComposedModal, ModalHeader, ModalBody, ModalFooter,
  OverflowMenu, OverflowMenuItem,
  DataTableSkeleton
} from '@carbon/react';
import { Add, Edit, TrashCan, Filter } from '@carbon/icons-react';

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
}

interface Channel {
  id: string;
  team_id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P' | 'D';
  member_count?: number;
  purpose?: string;
  header?: string;
}

interface ChannelFormData {
  team_id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P';
  purpose: string;
  header: string;
}

const headers = [
  { key: 'name', header: '채널 이름' },
  { key: 'displayName', header: '표시 이름' },
  { key: 'type', header: '유형' },
  { key: 'memberCount', header: '멤버 수' },
  { key: 'purpose', header: '목적' },
  { key: 'actions', header: '작업' },
];

export default function ChatChannelsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Form state
  const [formData, setFormData] = useState<ChannelFormData>({
    team_id: '',
    name: '',
    display_name: '',
    type: 'O',
    purpose: '',
    header: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error'; 
    title: string; 
    subtitle: string 
  } | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const data = await chatFetch<Team[]>('/teams');
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  }, []);

  const loadChannels = useCallback(async (teamId?: string) => {
    setLoading(true);
    setError('');
    try {
      const path = teamId ? `/channels?team_id=${encodeURIComponent(teamId)}` : '/channels';
      const data = await chatFetch<Channel[]>(path);
      setChannels(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '채널 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadChannels();
  }, [loadTeams, loadChannels]);

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.display_name : teamId;
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = !searchQuery ||
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTeam = !selectedTeamFilter || channel.team_id === selectedTeamFilter;
    
    return matchesSearch && matchesTeam;
  });

  const resetForm = () => {
    setFormData({
      team_id: teams.length > 0 ? teams[0].id : '',
      name: '',
      display_name: '',
      type: 'O',
      purpose: '',
      header: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModal(true);
  };

  const openEditModal = (channel: Channel) => {
    setSelectedChannel(channel);
    setFormData({
      team_id: channel.team_id,
      name: channel.name,
      display_name: channel.display_name,
      type: channel.type === 'D' ? 'O' : (channel.type as 'O' | 'P'), // DM은 공개로 처리
      purpose: channel.purpose || '',
      header: channel.header || ''
    });
    setEditModal(true);
  };

  const openDeleteModal = (channel: Channel) => {
    setSelectedChannel(channel);
    setDeleteModal(true);
  };

  const handleCreateChannel = async () => {
    setFormLoading(true);
    try {
      await chatFetch('/channels', {
        method: 'POST',
        body: JSON.stringify({
          team_id: formData.team_id,
          name: formData.name,
          display_name: formData.display_name,
          type: formData.type,
          purpose: formData.purpose || undefined,
          header: formData.header || undefined
        })
      });
      
      setNotification({
        type: 'success',
        title: '채널 생성 완료',
        subtitle: `채널 "${formData.display_name}"이 성공적으로 생성되었습니다.`
      });
      
      setCreateModal(false);
      resetForm();
      await loadChannels(selectedTeamFilter);
    } catch (err) {
      setNotification({
        type: 'error',
        title: '채널 생성 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditChannel = async () => {
    if (!selectedChannel) return;
    
    setFormLoading(true);
    try {
      await chatFetch(`/channels/${selectedChannel.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          team_id: formData.team_id,
          name: formData.name,
          display_name: formData.display_name,
          type: formData.type,
          purpose: formData.purpose || undefined,
          header: formData.header || undefined
        })
      });
      
      setNotification({
        type: 'success',
        title: '채널 수정 완료',
        subtitle: `채널 "${formData.display_name}"이 성공적으로 수정되었습니다.`
      });
      
      setEditModal(false);
      setSelectedChannel(null);
      resetForm();
      await loadChannels(selectedTeamFilter);
    } catch (err) {
      setNotification({
        type: 'error',
        title: '채널 수정 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    
    setFormLoading(true);
    try {
      await chatFetch(`/channels/${selectedChannel.id}`, {
        method: 'DELETE'
      });
      
      setNotification({
        type: 'success',
        title: '채널 삭제 완료',
        subtitle: `채널 "${selectedChannel.display_name}"이 성공적으로 삭제되었습니다.`
      });
      
      setDeleteModal(false);
      setSelectedChannel(null);
      await loadChannels(selectedTeamFilter);
    } catch (err) {
      setNotification({
        type: 'error',
        title: '채널 삭제 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    return formData.team_id && formData.name.trim() && formData.display_name.trim();
  };

  const getChannelTypeInfo = (type: string) => {
    switch (type) {
      case 'O': return { tagType: 'green', label: '공개' };
      case 'P': return { tagType: 'warm-gray', label: '비공개' };
      case 'D': return { tagType: 'blue', label: 'DM' };
      default: return { tagType: 'gray', label: type || '—' };
    }
  };

  const teamOptions = [
    { value: '', text: '전체 팀' },
    ...teams.map(team => ({ value: team.id, text: team.display_name }))
  ];

  const teamFormOptions = teams.map(team => ({
    value: team.id,
    text: team.display_name
  }));

  const rows = filteredChannels.map(channel => {
    const typeInfo = getChannelTypeInfo(channel.type);
    
    return {
      id: channel.id,
      name: channel.name,
      displayName: channel.display_name,
      type: <Tag type={typeInfo.tagType as any}>{typeInfo.label}</Tag>,
      memberCount: channel.member_count ?? '—',
      purpose: channel.purpose || '—',
      actions: (
        <OverflowMenu>
          <OverflowMenuItem itemText="수정" onClick={() => openEditModal(channel)} />
          <OverflowMenuItem 
            itemText="삭제" 
            isDelete 
            onClick={() => openDeleteModal(channel)} 
          />
        </OverflowMenu>
      )
    };
  });

  return (
    <>
      <PageHeader
        title="채널 관리"
        description="Mattermost 채널 목록 및 관리"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '200px' }}>
              <Dropdown
                id="team-filter"
                label="팀 필터"
                titleText=""
                items={teamOptions}
                selectedItem={teamOptions.find(opt => opt.value === selectedTeamFilter)}
                onChange={(e) => {
                  const teamId = e.selectedItem?.value || '';
                  setSelectedTeamFilter(teamId);
                  loadChannels(teamId);
                }}
                light
                size="sm"
              />
            </div>
            <Button
              kind="primary"
              renderIcon={Add}
              onClick={openCreateModal}
            >
              채널 생성
            </Button>
          </div>
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
              getRowProps
            }) => (
              <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
                <TableToolbar>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      placeholder="채널 이름으로 검색..."
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
                            {searchQuery || selectedTeamFilter 
                              ? '검색 결과가 없습니다.' 
                              : '채널이 없습니다.'}
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

      {/* 채널 생성 모달 */}
      <ComposedModal open={createModal} onClose={() => setCreateModal(false)}>
        <ModalHeader title="채널 생성" />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Dropdown
              id="create-team-select"
              titleText="팀 선택"
              label="팀을 선택하세요"
              items={teamFormOptions}
              selectedItem={teamFormOptions.find(opt => opt.value === formData.team_id)}
              onChange={(e) => setFormData(prev => ({ ...prev, team_id: e.selectedItem?.value || '' }))}
            />
            
            <TextInput
              id="channel-name"
              labelText="채널 이름"
              placeholder="영문소문자, 하이픈만 허용"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              helperText="URL에서 사용되는 고유한 식별자입니다."
            />
            
            <TextInput
              id="channel-display-name"
              labelText="표시 이름"
              placeholder="사용자에게 보여질 채널 이름"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            />
            
            <RadioButtonGroup
              legendText="채널 유형"
              name="channel-type"
              value={formData.type}
              onChange={(value) => setFormData(prev => ({ ...prev, type: value as 'O' | 'P' }))}
            >
              <RadioButton id="type-open" labelText="공개 (모든 팀 멤버가 참여 가능)" value="O" />
              <RadioButton id="type-private" labelText="비공개 (초대받은 사용자만 참여)" value="P" />
            </RadioButtonGroup>
            
            <TextArea
              id="channel-purpose"
              labelText="목적 (선택사항)"
              placeholder="채널의 목적을 설명하세요"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              rows={3}
            />
            
            <TextArea
              id="channel-header"
              labelText="헤더 (선택사항)"
              placeholder="채널 상단에 표시될 헤더 메시지"
              value={formData.header}
              onChange={(e) => setFormData(prev => ({ ...prev, header: e.target.value }))}
              rows={2}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateModal(false)}>
            취소
          </Button>
          <Button 
            kind="primary" 
            onClick={handleCreateChannel}
            disabled={!validateForm() || formLoading}
          >
            {formLoading ? '생성 중...' : '채널 생성'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 채널 수정 모달 */}
      <ComposedModal open={editModal} onClose={() => setEditModal(false)}>
        <ModalHeader title="채널 수정" />
        <ModalBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Dropdown
              id="edit-team-select"
              titleText="팀 선택"
              label="팀을 선택하세요"
              items={teamFormOptions}
              selectedItem={teamFormOptions.find(opt => opt.value === formData.team_id)}
              onChange={(e) => setFormData(prev => ({ ...prev, team_id: e.selectedItem?.value || '' }))}
            />
            
            <TextInput
              id="edit-channel-name"
              labelText="채널 이름"
              placeholder="영문소문자, 하이픈만 허용"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              helperText="URL에서 사용되는 고유한 식별자입니다."
            />
            
            <TextInput
              id="edit-channel-display-name"
              labelText="표시 이름"
              placeholder="사용자에게 보여질 채널 이름"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            />
            
            <RadioButtonGroup
              legendText="채널 유형"
              name="edit-channel-type"
              value={formData.type}
              onChange={(value) => setFormData(prev => ({ ...prev, type: value as 'O' | 'P' }))}
            >
              <RadioButton id="edit-type-open" labelText="공개 (모든 팀 멤버가 참여 가능)" value="O" />
              <RadioButton id="edit-type-private" labelText="비공개 (초대받은 사용자만 참여)" value="P" />
            </RadioButtonGroup>
            
            <TextArea
              id="edit-channel-purpose"
              labelText="목적 (선택사항)"
              placeholder="채널의 목적을 설명하세요"
              value={formData.purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
              rows={3}
            />
            
            <TextArea
              id="edit-channel-header"
              labelText="헤더 (선택사항)"
              placeholder="채널 상단에 표시될 헤더 메시지"
              value={formData.header}
              onChange={(e) => setFormData(prev => ({ ...prev, header: e.target.value }))}
              rows={2}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setEditModal(false)}>
            취소
          </Button>
          <Button 
            kind="primary" 
            onClick={handleEditChannel}
            disabled={!validateForm() || formLoading}
          >
            {formLoading ? '수정 중...' : '수정 완료'}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* 채널 삭제 확인 모달 */}
      <ComposedModal open={deleteModal} onClose={() => setDeleteModal(false)}>
        <ModalHeader title="채널 삭제 확인" />
        <ModalBody>
          <p>정말로 이 채널을 삭제하시겠습니까?</p>
          {selectedChannel && (
            <div style={{ 
              background: '#f4f4f4', 
              border: '1px solid #e0e0e0', 
              padding: '1rem', 
              marginTop: '1rem',
              borderRadius: '4px'
            }}>
              <strong>채널 이름:</strong> {selectedChannel.display_name} ({selectedChannel.name})
              <br />
              <strong>소속 팀:</strong> {getTeamName(selectedChannel.team_id)}
              <br />
              <strong>유형:</strong> {getChannelTypeInfo(selectedChannel.type).label}
              {selectedChannel.member_count !== undefined && (
                <>
                  <br />
                  <strong>멤버 수:</strong> {selectedChannel.member_count}
                </>
              )}
            </div>
          )}
          <p style={{ color: '#da1e28', marginTop: '1rem' }}>
            <strong>주의:</strong> 이 작업은 되돌릴 수 없습니다. 채널과 관련된 모든 메시지와 데이터가 삭제됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setDeleteModal(false)}>
            취소
          </Button>
          <Button 
            kind="danger" 
            onClick={handleDeleteChannel}
            disabled={formLoading}
          >
            {formLoading ? '삭제 중...' : '삭제 확인'}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </>
  );
}