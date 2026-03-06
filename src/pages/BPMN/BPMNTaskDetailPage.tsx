// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TextInput,
  NumberInput,
  Toggle,
  Modal,
  Tag,
  InlineNotification,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import BpmnViewer from '../../components/BpmnViewer';
import { PageHeader } from '../../components/PageHeader';

const BASE = '/api/v1/engines/bpmn';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

function fmtDate(ts?: string) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function BPMNTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form variables
  const [formVars, setFormVars] = useState<Record<string, any>>({});
  const [localVars, setLocalVars] = useState<Record<string, any>>({});
  const [formLoading, setFormLoading] = useState(false);

  // BPMN XML for Diagram tab
  const [bpmnXml, setBpmnXml] = useState('');

  // Notification
  const [notification, setNotification] = useState<{ kind: string; title: string } | null>(null);

  // Delegate modal
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateUser, setDelegateUser] = useState('');

  // Date modals
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const loadTask = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const t = await apiFetch(`/tasks/${id}`);
      setTask(t);
      setFollowUpDate(t?.followUp ? t.followUp.slice(0, 16) : '');
      setDueDate(t?.due ? t.due.slice(0, 16) : '');
      // Load form variables
      setFormLoading(true);
      try {
        const vars = await apiFetch(`/tasks/${id}/form-variables`);
        setFormVars(vars || {});
        const init: Record<string, any> = {};
        Object.entries(vars || {}).forEach(([k, v]: any) => { init[k] = v.value; });
        setLocalVars(init);
      } catch {}
      setFormLoading(false);
      // Load BPMN XML if processDefinitionId available
      if (t?.processDefinitionId) {
        try {
          const xmlData = await apiFetch(`/processes/${t.processDefinitionId}/xml`);
          setBpmnXml(xmlData?.bpmn20Xml || '');
        } catch {}
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadTask(); }, [id]);

  const showNotif = (kind: string, title: string) => {
    setNotification({ kind, title });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClaim = async () => {
    try {
      await apiFetch(`/tasks/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'admin' }),
      });
      showNotif('success', '태스크를 할당받았습니다.');
      loadTask();
    } catch (e: any) { showNotif('error', '할당 실패: ' + e.message); }
  };

  const handleUnclaim = async () => {
    try {
      await apiFetch(`/tasks/${id}/unclaim`, { method: 'POST' });
      showNotif('success', '태스크 할당이 해제되었습니다.');
      loadTask();
    } catch (e: any) { showNotif('error', '해제 실패: ' + e.message); }
  };

  const handleDelegate = async () => {
    if (!delegateUser.trim()) return;
    try {
      await apiFetch(`/tasks/${id}/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: delegateUser }),
      });
      showNotif('success', `${delegateUser}에게 위임했습니다.`);
      setDelegateOpen(false);
      setDelegateUser('');
      loadTask();
    } catch (e: any) { showNotif('error', '위임 실패: ' + e.message); }
  };

  const handleComplete = async () => {
    try {
      const variables: Record<string, any> = {};
      Object.entries(formVars).forEach(([k, v]: any) => {
        variables[k] = { value: localVars[k] ?? v.value, type: v.type };
      });
      await apiFetch(`/tasks/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables }),
      });
      showNotif('success', '태스크가 완료되었습니다.');
      setTimeout(() => navigate('/bpmn/tasks'), 1500);
    } catch (e: any) { showNotif('error', '완료 실패: ' + e.message); }
  };

  const handleSave = () => {
    showNotif('success', '변수가 저장되었습니다. (로컬)');
  };

  const renderFormField = (key: string, varDef: any) => {
    const type = (varDef.type || 'String').toLowerCase();
    const val = localVars[key] ?? varDef.value;
    const setVal = (v: any) => setLocalVars(prev => ({ ...prev, [key]: v }));

    if (type === 'boolean') {
      return (
        <div key={key} style={{ marginBottom: '1.25rem' }}>
          <Toggle
            id={`var-${key}`}
            labelText={key}
            labelA="False"
            labelB="True"
            toggled={!!val}
            onToggle={(v: boolean) => setVal(v)}
           
          />
        </div>
      );
    }
    if (type === 'integer' || type === 'long' || type === 'double' || type === 'short') {
      return (
        <div key={key} style={{ marginBottom: '1.25rem' }}>
          <NumberInput
            id={`var-${key}`}
            label={key}
            value={val ?? 0}
            onChange={(_e: any, { value }: any) => setVal(value)}
           
          />
        </div>
      );
    }
    return (
      <div key={key} style={{ marginBottom: '1.25rem' }}>
        <TextInput
          id={`var-${key}`}
          labelText={key}
          value={val ?? ''}
          onChange={(e: any) => setVal(e.target.value)}
         
        />
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>;
  if (!task) return null;

  const processKey = task.processDefinitionId ? task.processDefinitionId.split(':')[0] : task.processDefinitionId;
  const activeActivityIds = task.taskDefinitionKey ? [task.taskDefinitionKey] : [];

  return (
    <>
      <PageHeader
        title={task.name || '(이름 없음)'}
        description={
          <span style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn')}>Dashboard</span>
            {' > '}
            <span style={{ cursor: 'pointer', color: '#0f62fe' }} onClick={() => navigate('/bpmn/tasks')}>Tasks</span>
            {' > '}
            <span style={{ color: 'var(--cds-text-primary)' }}>{task.name || id}</span>
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {task.assignee ? (
              <Button kind="secondary" onClick={handleUnclaim}>Unclaim</Button>
            ) : (
              <Button kind="primary" onClick={handleClaim}>Claim</Button>
            )}
            <Button kind="ghost" onClick={() => setDelegateOpen(true)}>Delegate</Button>
            <Button kind="ghost" renderIcon={Renew} onClick={loadTask}>새로고침</Button>
          </div>
        }
      />

      {notification && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind={notification.kind as any}
            title={notification.title}
            lowContrast
          />
        </div>
      )}

      {/* Task header info */}
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderBottom: 'none',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
      }}>
        {/* Process link */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Process</span>
          <div>
            <span
              style={{ color: '#0f62fe', cursor: 'pointer', fontSize: '0.875rem' }}
              onClick={() => task.processDefinitionId && navigate(`/bpmn/processes/${task.processDefinitionId}`)}
            >
              {processKey || '—'}
            </span>
          </div>
        </div>

        {/* Follow-up date */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Follow-up date</span>
          <div>
            <span
              style={{ color: '#0f62fe', cursor: 'pointer', fontSize: '0.875rem' }}
              onClick={() => setFollowUpOpen(true)}
            >
              {fmtDate(task.followUp) || 'Set follow-up date'}
            </span>
          </div>
        </div>

        {/* Due date */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Due date</span>
          <div>
            <span
              style={{ color: '#0f62fe', cursor: 'pointer', fontSize: '0.875rem' }}
              onClick={() => setDueOpen(true)}
            >
              {fmtDate(task.due) || 'Set due date'}
            </span>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Assignee</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {task.assignee ? (
              <Tag type="blue">{task.assignee}</Tag>
            ) : (
              <span style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>미배정</span>
            )}
          </div>
        </div>

        {/* Created */}
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Created</span>
          <div style={{ fontSize: '0.875rem' }}>{fmtDate(task.created) || '—'}</div>
        </div>

        {/* Task Key */}
        {task.taskDefinitionKey && (
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Task Key</span>
            <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{task.taskDefinitionKey}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
        <Tabs>
          <TabList contained aria-label="Task detail tabs">
            <Tab>Form</Tab>
            <Tab>History</Tab>
            <Tab>Diagram</Tab>
            <Tab>Description</Tab>
          </TabList>
          <TabPanels>

            {/* Form tab */}
            <TabPanel>
              <div style={{ padding: '1.5rem', maxWidth: '600px' }}>
                {formLoading ? (
                  <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>폼 변수 로딩 중...</div>
                ) : Object.keys(formVars).length === 0 ? (
                  <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>
                    이 태스크에는 폼 변수가 없습니다.
                  </div>
                ) : (
                  <>
                    {Object.entries(formVars).map(([k, v]) => renderFormField(k, v))}
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                      <Button kind="secondary" onClick={handleSave}>Save</Button>
                      <Button kind="primary" onClick={handleComplete}>Complete</Button>
                    </div>
                  </>
                )}
                {Object.keys(formVars).length === 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                    <Button kind="primary" onClick={handleComplete}>Complete</Button>
                  </div>
                )}
              </div>
            </TabPanel>

            {/* History tab */}
            <TabPanel>
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                기록이 없습니다.
              </div>
            </TabPanel>

            {/* Diagram tab */}
            <TabPanel>
              <div style={{ padding: 0 }}>
                {bpmnXml ? (
                  <BpmnViewer
                    xml={bpmnXml}
                    activeActivityIds={activeActivityIds}
                    height="500px"
                  />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
                    BPMN 다이어그램을 불러올 수 없습니다.
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Description tab */}
            <TabPanel>
              <div style={{ padding: '1.5rem' }}>
                {task.description ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-primary)', whiteSpace: 'pre-wrap' }}>{task.description}</p>
                ) : (
                  <div style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>설명이 없습니다.</div>
                )}
              </div>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </div>

      {/* Delegate Modal */}
      <Modal
        open={delegateOpen}
        modalHeading="태스크 위임"
        primaryButtonText="위임"
        secondaryButtonText="취소"
        onRequestClose={() => setDelegateOpen(false)}
        onRequestSubmit={handleDelegate}
       
      >
        <TextInput
          id="delegate-user"
          labelText="사용자 ID"
          placeholder="위임할 사용자 ID를 입력하세요"
          value={delegateUser}
          onChange={(e: any) => setDelegateUser(e.target.value)}
        />
      </Modal>

      {/* Follow-up Date Modal */}
      <Modal
        open={followUpOpen}
        modalHeading="Follow-up 날짜 설정"
        primaryButtonText="확인"
        secondaryButtonText="취소"
        onRequestClose={() => setFollowUpOpen(false)}
        onRequestSubmit={() => {
          setTask((prev: any) => ({ ...prev, followUp: followUpDate ? new Date(followUpDate).toISOString() : null }));
          setFollowUpOpen(false);
        }}
       
      >
        <TextInput
          id="follow-up-date"
          labelText="날짜 및 시간"
          type="datetime-local"
          value={followUpDate}
          onChange={(e: any) => setFollowUpDate(e.target.value)}
        />
      </Modal>

      {/* Due Date Modal */}
      <Modal
        open={dueOpen}
        modalHeading="마감 날짜 설정"
        primaryButtonText="확인"
        secondaryButtonText="취소"
        onRequestClose={() => setDueOpen(false)}
        onRequestSubmit={() => {
          setTask((prev: any) => ({ ...prev, due: dueDate ? new Date(dueDate).toISOString() : null }));
          setDueOpen(false);
        }}
       
      >
        <TextInput
          id="due-date"
          labelText="날짜 및 시간"
          type="datetime-local"
          value={dueDate}
          onChange={(e: any) => setDueDate(e.target.value)}
        />
      </Modal>
    </>
  );
}
