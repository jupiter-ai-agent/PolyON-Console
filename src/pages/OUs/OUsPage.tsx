import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Tag,
  Modal,
  TextInput,
  Loading,
  InlineNotification,
  Select,
  SelectItem,
  FormLabel,
} from '@carbon/react';
import { Add, Renew, FolderOpen, UserAvatar, Group, Enterprise, ChevronRight, ChevronDown, TrashCan } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import {
  ouTree,
  ouContents,
  createOU,
  deleteOU,
  listOUs,
  moveUser,
  moveGroup,
  updateUser,
  type OU,
  type User,
  type Group as GroupType,
  type OUsResponse,
} from '../../api/users';
import { useAppStore } from '../../store/useAppStore';

interface ContentData {
  users?: User[];
  groups?: GroupType[];
  sub_ous?: OU[];
}

export default function OUsPage() {
  const [treeData, setTreeData] = useState<OUsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDn, setSelectedDn] = useState<string | null>(null);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelUser, setPanelUser] = useState<User | null>(null);
  const [panelGroup, setPanelGroup] = useState<GroupType | null>(null);

  // Modals
  const [createOUOpen, setCreateOUOpen] = useState(false);
  const [createOUParent, setCreateOUParent] = useState<string | undefined>();
  const [ouName, setOuName] = useState('');
  const [ouDesc, setOuDesc] = useState('');
  const [deleteOUOpen, setDeleteOUOpen] = useState(false);
  const [deletingDn, setDeletingDn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // User edit panel state
  const [editGiven, setEditGiven] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editMail, setEditMail] = useState('');

  // Move modal
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState('');
  const [movingUsername, setMovingUsername] = useState('');
  const [movingGroupName, setMovingGroupName] = useState('');
  const [ouList, setOuList] = useState<OU[]>([]);

  const showToast = useAppStore((s) => s.showToast);
  const domainLower = useAppStore((s) => s.domainInfo.realmLower) || 'example.com';
  const baseDN = useAppStore((s) => s.domainInfo.base_dn) || `DC=${domainLower.split('.').join(',DC=')}`;
  const didMount = useRef(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tree, ous] = await Promise.all([ouTree(), listOUs()]);
      setTreeData(tree);
      setOuList(ous.ous || []);
      if (selectedDn) loadContent(selectedDn);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedDn]);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; loadTree(); }
  }, [loadTree]);

  const loadContent = async (dn: string) => {
    setContentLoading(true);
    try {
      const data = await ouContents(dn);
      setContentData(data);
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
      setContentData(null);
    } finally {
      setContentLoading(false);
    }
  };

  const selectNode = (dn: string) => {
    setSelectedDn(dn);
    setPanelOpen(false);
    loadContent(dn);
  };

  const toggleExpand = (dn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(dn)) next.delete(dn);
      else next.add(dn);
      return next;
    });
  };

  // ─── Tree rendering ───

  const ous = treeData?.ous || [];
  const byParent: Record<string, OU[]> = {};
  ous.forEach((ou) => {
    const parent = ou.parent_dn || baseDN;
    if (!byParent[parent]) byParent[parent] = [];
    byParent[parent].push(ou);
  });

  const renderOU = (ou: OU, depth: number): React.ReactNode => {
    const children = (byParent[ou.dn] || []).sort((a, b) => a.name.localeCompare(b.name));
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(ou.dn);
    const isSelected = selectedDn === ou.dn;

    return (
      <div key={ou.dn}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `5px 8px 5px ${8 + depth * 16}px`,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            background: isSelected ? 'var(--cds-layer-selected-01)' : 'transparent',
            userSelect: 'none',
          }}
          onClick={() => selectNode(ou.dn)}
          onKeyDown={(e) => e.key === 'Enter' && selectNode(ou.dn)}
        >
          {hasChildren ? (
            <span
              style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 4 }}
              onClick={(e) => toggleExpand(ou.dn, e)}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          ) : (
            <span style={{ width: 20, flexShrink: 0 }} />
          )}
          <Enterprise size={14} style={{ flexShrink: 0, marginRight: 6 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ou.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderOU(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootOUs = (byParent[baseDN] || []).sort((a, b) => a.name.localeCompare(b.name));

  // ─── Content panel ───

  const _sysAccounts = new Set(['krbtgt', 'guest']);
  const filteredUsers = (contentData?.users || []).filter((u) => !_sysAccounts.has((u.username || '').toLowerCase()));
  const contentGroups = contentData?.groups || [];
  const subOUs = contentData?.sub_ous || [];

  const selectedOU = ous.find((o) => o.dn === selectedDn);
  const isBase = selectedDn === baseDN;
  const ouLabel = isBase
    ? domainLower.toUpperCase()
    : selectedDn?.split(',')[0].replace('OU=', '') || '';

  // ─── Panel helpers ───

  const openUserPanel = async (username: string) => {
    try {
      const u = await import('../../api/users').then((m) => m.getUser(username));
      setPanelUser(u);
      setPanelGroup(null);
      setEditGiven(u.given_name || '');
      setEditSurname(u.surname || '');
      setEditMail(u.mail || '');
      setPanelTitle(username);
      setPanelOpen(true);
    } catch {}
  };

  const openGroupPanel = async (groupName: string) => {
    try {
      const g = await import('../../api/users').then((m) => m.getGroup(groupName));
      setPanelGroup(g);
      setPanelUser(null);
      setPanelTitle(groupName);
      setPanelOpen(true);
    } catch {}
  };

  const saveUser = async () => {
    if (!panelUser) return;
    try {
      await updateUser(panelUser.username, { given_name: editGiven || undefined, surname: editSurname || undefined, mail: editMail || undefined });
      showToast('저장 완료', 'success');
      if (selectedDn) loadContent(selectedDn);
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleCreateOU = async () => {
    if (!ouName) { showToast('이름을 입력하세요', 'error'); return; }
    setSubmitting(true);
    try {
      await createOU({ name: ouName, parent_dn: createOUParent || undefined, description: ouDesc || undefined });
      showToast(`OU '${ouName}' 생성 완료`, 'success');
      setCreateOUOpen(false);
      setOuName('');
      setOuDesc('');
      await loadTree();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOU = async () => {
    if (!deletingDn) return;
    setSubmitting(true);
    try {
      await deleteOU(deletingDn);
      showToast('OU 삭제 완료', 'success');
      setDeleteOUOpen(false);
      setSelectedDn(null);
      setContentData(null);
      await loadTree();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveUser = async () => {
    if (!movingUsername || !moveTarget) return;
    try {
      await moveUser(movingUsername, moveTarget);
      showToast(`'${movingUsername}' 이동 완료`, 'success');
      setMoveOpen(false);
      if (selectedDn) loadContent(selectedDn);
      await loadTree();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleMoveGroup = async () => {
    if (!movingGroupName || !moveTarget) return;
    try {
      await moveGroup(movingGroupName, moveTarget);
      showToast(`'${movingGroupName}' 이동 완료`, 'success');
      setMoveOpen(false);
      if (selectedDn) loadContent(selectedDn);
      await loadTree();
    } catch (e: unknown) {
      showToast((e as Error).message, 'error');
    }
  };

  const ouOptions = [
    { dn: `CN=Users,${baseDN}`, name: 'CN=Users (기본)' },
    ...ouList.map((o) => ({ dn: o.dn, name: o.name })),
  ];

  return (
    <>
      <PageHeader
        title="Directory Tree"
        description="조직 구조 관리 — OU 계층, 사용자/그룹 배치 및 이동"
        actions={
          <>
            <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly onClick={loadTree} />
            <Button renderIcon={Add} onClick={() => { setCreateOUParent(undefined); setCreateOUOpen(true); }}>
              OU 추가
            </Button>
          </>
        }
      />

      {error && (
        <InlineNotification kind="error" title="로딩 오류" subtitle={error} style={{ marginBottom: '1rem' }} lowContrast />
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loading description="디렉터리 트리 로딩 중" withOverlay={false} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', border: '1px solid var(--cds-border-subtle)', background: 'var(--cds-layer-01)', minHeight: 500, position: 'relative' }}>
          {/* Tree panel */}
          <div style={{ borderRight: '1px solid var(--cds-border-subtle)', overflowY: 'auto' }}>
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--cds-border-subtle)' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>조직 구조</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly onClick={loadTree} />
                <Button kind="ghost" renderIcon={Add} iconDescription="OU 추가" hasIconOnly onClick={() => { setCreateOUParent(undefined); setCreateOUOpen(true); }} />
              </div>
            </div>

            <div style={{ padding: '4px 0' }}>
              {/* Base domain node */}
              <div
                style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', cursor: 'pointer', fontSize: '0.8125rem', background: selectedDn === baseDN ? 'var(--cds-layer-selected-01)' : 'transparent' }}
                onClick={() => selectNode(baseDN)}
              >
                <Enterprise size={14} style={{ flexShrink: 0, marginRight: 6, marginLeft: 20 }} />
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domainLower}</span>
              </div>
              {rootOUs.map((ou) => renderOU(ou, 1))}
            </div>
          </div>

          {/* Content panel */}
          <div style={{ overflowY: 'auto', position: 'relative' }}>
            <div
              id="ouContent"
              style={{
                padding: '20px',
                transition: 'margin-right .25s ease',
                marginRight: panelOpen ? 380 : 0,
              }}
            >
              {!selectedDn ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--cds-text-placeholder)', fontSize: '0.875rem' }}>
                  <FolderOpen size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <br />좌측 트리에서 조직 단위를 선택하세요
                </div>
              ) : contentLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loading small description="로딩 중" withOverlay={false} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: '1.125rem', fontWeight: 400, margin: 0 }}>{ouLabel}</h2>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>{selectedDn}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!isBase && selectedOU && (
                        <Button
                         
                          kind="danger--ghost"
                          renderIcon={TrashCan}
                          onClick={() => { setDeletingDn(selectedDn!); setDeleteOUOpen(true); }}
                        >
                          삭제
                        </Button>
                      )}
                      <Button
                       
                        kind="ghost"
                        renderIcon={Add}
                        onClick={() => { setCreateOUParent(selectedDn || undefined); setCreateOUOpen(true); }}
                      >
                        하위 OU 추가
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <Tag type="blue">{filteredUsers.length} 사용자</Tag>
                    <Tag type="teal">{contentGroups.length} 그룹</Tag>
                    <Tag type="purple">{subOUs.length} 하위 OU</Tag>
                  </div>

                  {/* Sub OUs */}
                  {subOUs.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <FormLabel style={{ marginBottom: 8 }}>하위 조직 단위</FormLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {subOUs.map((s) => (
                          <div
                            key={s.dn}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle)', cursor: 'pointer', fontSize: '0.8125rem' }}
                            onClick={() => selectNode(s.dn)}
                          >
                            <Enterprise size={14} />
                            <strong>{s.name}</strong>
                            {s.description && <span style={{ color: 'var(--cds-text-secondary)' }}>— {s.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Users */}
                  {filteredUsers.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <FormLabel style={{ marginBottom: 8 }}>사용자</FormLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {filteredUsers.map((u) => (
                          <div
                            key={u.username}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '4px 10px 4px 4px',
                              background: 'var(--cds-layer-02)',
                              border: `1px solid ${u.enabled ? 'var(--cds-border-subtle)' : 'var(--cds-support-error)'}`,
                              cursor: 'pointer',
                              opacity: u.enabled ? 1 : 0.6,
                              fontSize: '0.8125rem',
                            }}
                            onClick={() => openUserPanel(u.username)}
                          >
                            <UserAvatar size={16} />
                            <span style={{ fontWeight: 500 }}>{u.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groups */}
                  {contentGroups.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <FormLabel style={{ marginBottom: 8 }}>그룹</FormLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {contentGroups.map((g) => (
                          <div
                            key={g.name}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle)', fontSize: '0.8125rem', cursor: 'pointer' }}
                            onClick={() => openGroupPanel(g.name)}
                          >
                            <Group size={14} />
                            <span style={{ fontWeight: 500 }}>{g.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredUsers.length === 0 && contentGroups.length === 0 && subOUs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cds-text-placeholder)', fontSize: '0.875rem' }}>
                      비어 있는 조직 단위입니다
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sliding detail panel */}
            <div style={{
              position: 'absolute', top: 0, right: panelOpen ? 0 : -400,
              width: 380, height: '100%',
              background: 'var(--cds-layer-01)',
              borderLeft: '1px solid var(--cds-border-subtle)',
              boxShadow: '-4px 0 16px rgba(0,0,0,.08)',
              transition: 'right .25s ease',
              overflowY: 'auto',
              zIndex: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{panelTitle}</span>
                <Button kind="ghost" renderIcon={() => <span style={{ fontSize: '1rem' }}>✕</span>} iconDescription="닫기" hasIconOnly onClick={() => setPanelOpen(false)} />
              </div>

              <div style={{ padding: '1rem' }}>
                {panelUser && (
                  <>
                    {/* User info */}
                    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <p style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--cds-text-secondary)', wordBreak: 'break-all' }}>{panelUser.dn}</p>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <TextInput id="pGiven" labelText="Given Name" value={editGiven} onChange={(e) => setEditGiven(e.target.value)} style={{ marginBottom: '0.5rem' }} />
                      <TextInput id="pSurname" labelText="Surname" value={editSurname} onChange={(e) => setEditSurname(e.target.value)} style={{ marginBottom: '0.5rem' }} />
                      <TextInput id="pMail" labelText="외부 메일" value={editMail} onChange={(e) => setEditMail(e.target.value)} style={{ marginBottom: '0.75rem' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={saveUser}>저장</Button>
                        <Button kind="ghost" onClick={() => {
                          setMovingUsername(panelUser.username);
                          setMovingGroupName('');
                          setMoveTarget('');
                          setMoveOpen(true);
                        }}>
                          OU 이동
                        </Button>
                      </div>
                    </div>
                    {panelUser.member_of && panelUser.member_of.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--cds-border-subtle)', paddingTop: '1rem' }}>
                        <FormLabel>소속 그룹</FormLabel>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                          {panelUser.member_of.map((g) => {
                            const cn = g.match(/^CN=([^,]+)/i)?.[1] || g;
                            return <Tag key={cn} type="blue">{cn}</Tag>;
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {panelGroup && (
                  <>
                    <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                      <Group size={20} style={{ marginBottom: 8 }} />
                      {panelGroup.description && <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: 4 }}>{panelGroup.description}</p>}
                      <p style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--cds-text-placeholder)', wordBreak: 'break-all' }}>{panelGroup.dn}</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <FormLabel>멤버 ({(panelGroup.members || []).length})</FormLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                        {(panelGroup.members || []).map((m) => {
                          const cn = m.match(/^CN=([^,]+)/i)?.[1] || m;
                          return <Tag key={cn} type="blue">{cn}</Tag>;
                        })}
                        {!(panelGroup.members || []).length && <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-placeholder)' }}>멤버 없음</span>}
                      </div>
                    </div>
                    <Button kind="ghost" onClick={() => {
                      setMovingGroupName(panelGroup.name);
                      setMovingUsername('');
                      setMoveTarget('');
                      setMoveOpen(true);
                    }}>
                      OU 이동
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create OU Modal */}
      <Modal
        open={createOUOpen}
        modalHeading="OU 추가"
        primaryButtonText="생성"
        secondaryButtonText="취소"
        onRequestSubmit={handleCreateOU}
        onRequestClose={() => setCreateOUOpen(false)}
        onSecondarySubmit={() => setCreateOUOpen(false)}
        primaryButtonDisabled={submitting}
        size="xs"
      >
        <TextInput id="ouName" labelText="이름 *" value={ouName} onChange={(e) => setOuName(e.target.value)} placeholder="예: IT사업부" />
        <TextInput id="ouDesc" labelText="설명" value={ouDesc} onChange={(e) => setOuDesc(e.target.value)} placeholder="조직 설명" style={{ marginTop: '1rem' }} />
        {createOUParent && (
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)', fontFamily: 'IBM Plex Mono' }}>
            상위 OU: {createOUParent}
          </div>
        )}
      </Modal>

      {/* Delete OU Modal */}
      <Modal
        open={deleteOUOpen}
        danger
        modalHeading="OU 삭제"
        primaryButtonText="삭제"
        secondaryButtonText="취소"
        onRequestSubmit={handleDeleteOU}
        onRequestClose={() => setDeleteOUOpen(false)}
        onSecondarySubmit={() => setDeleteOUOpen(false)}
        primaryButtonDisabled={submitting}
        size="xs"
      >
        <p>이 OU를 삭제하시겠습니까?<br />
          <span style={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', color: 'var(--cds-text-secondary)', wordBreak: 'break-all' }}>{deletingDn}</span>
        </p>
      </Modal>

      {/* Move Modal */}
      <Modal
        open={moveOpen}
        modalHeading={movingUsername ? `사용자 이동 — ${movingUsername}` : `그룹 이동 — ${movingGroupName}`}
        primaryButtonText="이동"
        secondaryButtonText="취소"
        onRequestSubmit={movingUsername ? handleMoveUser : handleMoveGroup}
        onRequestClose={() => setMoveOpen(false)}
        onSecondarySubmit={() => setMoveOpen(false)}
        size="xs"
      >
        <Select id="moveTarget" labelText="이동할 OU 선택" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
          <SelectItem value="" text="선택하세요" />
          {ouOptions.map((o) => (
            <SelectItem key={o.dn} value={o.dn} text={o.name} />
          ))}
        </Select>
      </Modal>
    </>
  );
}
