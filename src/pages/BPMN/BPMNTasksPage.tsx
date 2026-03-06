// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  Dropdown,
  Tag,
  InlineNotification,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

function relativeTime(ts?: string) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

type FilterKey = 'all' | 'mine' | 'unassigned' | 'group';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체 태스크' },
  { key: 'mine', label: '내 태스크' },
  { key: 'unassigned', label: '미할당 태스크' },
  { key: 'group', label: '그룹 태스크' },
];

export default function BPMNTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Start process modal
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  // Create task notification
  const [showCreateNotif, setShowCreateNotif] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${BASE}/tasks?maxResults=500&sortBy=created&sortOrder=desc`),
        fetch(`${BASE}/processes?maxResults=500&sortBy=name&sortOrder=asc`),
      ]);
      if (!tRes.ok) throw new Error('HTTP ' + tRes.status);
      const tData = await tRes.json();
      setTasks(Array.isArray(tData) ? tData : []);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProcesses(Array.isArray(pData) ? pData : []);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'mine') return !!t.assignee;
    if (activeFilter === 'unassigned') return !t.assignee;
    if (activeFilter === 'group') return !!t.candidateGroups?.length;
    return true;
  });

  const handleStartProcess = async () => {
    if (!selectedProcess) return;
    setStarting(true);
    setStartError('');
    try {
      const res = await fetch(`${BASE}/processes/key/${selectedProcess.key}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStartModalOpen(false);
      setSelectedProcess(null);
      load();
    } catch (e: any) {
      setStartError(e.message);
    }
    setStarting(false);
  };

  const processItems = processes.map(p => ({ id: p.id, label: `${p.name || p.key} (v${p.version})`, key: p.key }));

  return (
    <>
      <PageHeader
        title="사용자 태스크"
        description="대기 중인 사용자 태스크 목록"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Button kind="secondary" onClick={() => { setShowCreateNotif(true); setTimeout(() => setShowCreateNotif(false), 3000); }}>
              Create task
            </Button>
            <Button kind="primary" onClick={() => setStartModalOpen(true)}>
              Start process
            </Button>
            <Button kind="ghost" renderIcon={Renew} onClick={load}>
              새로고침
            </Button>
          </div>
        }
      />

      {showCreateNotif && (
        <div style={{ marginTop: '0.75rem' }}>
          <InlineNotification
            kind="info"
            title="추후 지원 예정"
            subtitle="태스크 직접 생성 기능은 아직 지원되지 않습니다."
            lowContrast
            onClose={() => setShowCreateNotif(false)}
          />
        </div>
      )}

      <div style={{ display: 'flex', marginTop: '1.5rem', gap: '1.25rem' }}>
        {/* 좌측 필터 사이드바 */}
        <div style={{ width: 200, flexShrink: 0, background: '#fff', border: '1px solid #e0e0e0' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
            필터
          </div>
          {FILTERS.map(f => (
            <div
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                borderLeft: activeFilter === f.key ? '3px solid #0f62fe' : '3px solid transparent',
                background: activeFilter === f.key ? '#e8f0fe' : undefined,
                fontWeight: activeFilter === f.key ? 600 : undefined,
                color: activeFilter === f.key ? '#0f62fe' : undefined,
              }}
            >
              {f.label}
              <span style={{ marginLeft: '0.5rem', color: 'var(--cds-text-secondary)', fontWeight: 400, fontSize: '0.75rem' }}>
                ({tasks.filter(t => {
                  if (f.key === 'mine') return !!t.assignee;
                  if (f.key === 'unassigned') return !t.assignee;
                  if (f.key === 'group') return !!t.candidateGroups?.length;
                  return true;
                }).length})
              </span>
            </div>
          ))}
        </div>

        {/* 태스크 카드 목록 */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
          ) : error ? (
            <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0' }}>
              태스크가 없습니다.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredTasks.map(t => {
                const processKey = t.processDefinitionId ? t.processDefinitionId.split(':')[0] : null;
                const isOverdue = t.due && new Date(t.due) < new Date();
                return (
                  <div
                    key={t.id}
                    onClick={() => t.id && navigate(`/bpmn/tasks/${t.id}`)}
                    style={{
                      background: '#fff',
                      border: `1px solid ${isOverdue ? '#da1e28' : '#e0e0e0'}`,
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e: any) => { e.currentTarget.style.background = '#f4f4f4'; }}
                    onMouseLeave={(e: any) => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t.name || '(이름 없음)'}</span>
                      {t.assignee ? (
                        <Tag type="blue">{t.assignee}</Tag>
                      ) : (
                        <Tag type="gray">미배정</Tag>
                      )}
                    </div>
                    {processKey && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginTop: '0.35rem' }}>
                        {processKey}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.6rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
                      <span>생성: {relativeTime(t.created)}</span>
                      {t.due && (
                        <span style={{ color: isOverdue ? '#da1e28' : undefined }}>
                          마감: {relativeTime(t.due)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Start Process Modal */}
      <Modal
        open={startModalOpen}
        modalHeading="프로세스 시작"
        primaryButtonText={starting ? '시작 중...' : '시작'}
        secondaryButtonText="취소"
        onRequestSubmit={handleStartProcess}
        onRequestClose={() => { setStartModalOpen(false); setSelectedProcess(null); setStartError(''); }}
        primaryButtonDisabled={!selectedProcess || starting}
      >
        <div style={{ marginBottom: '1rem' }}>
          <Dropdown
            id="process-start-dropdown"
            titleText="프로세스 정의"
            label="프로세스를 선택하세요"
            items={processItems}
            itemToString={(item: any) => item?.label || ''}
            onChange={({ selectedItem }: any) => setSelectedProcess(selectedItem)}
          />
        </div>
        {startError && (
          <div style={{ color: '#da1e28', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            오류: {startError}
          </div>
        )}
      </Modal>
    </>
  );
}
