// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import {
  Button,
  Modal,
  TextInput,
  InlineNotification,
} from '@carbon/react';
import { PageHeader } from '../../components/PageHeader';
import BpmnViewer from '../../components/BpmnViewer';

const BASE = '/api/v1/engines/bpmn';

async function bpmnFetch(path: string, options?: RequestInit) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function bpmnFetchText(path: string) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('ko-KR');
  } catch {
    return dateStr;
  }
}

export default function BPMNDeploymentsPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedDeploy, setSelectedDeploy] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [bpmnXml, setBpmnXml] = useState<string>('');
  const [loadingDeploys, setLoadingDeploys] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New deploy modal
  const [newDeployOpen, setNewDeployOpen] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deployFiles, setDeployFiles] = useState<FileList | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployNotification, setDeployNotification] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDeployments();
  }, []);

  async function loadDeployments() {
    setLoadingDeploys(true);
    try {
      const data = await bpmnFetch('/deployments');
      setDeployments(Array.isArray(data) ? data : []);
    } catch {
      setDeployments([]);
    }
    setLoadingDeploys(false);
  }

  async function selectDeployment(deploy: any) {
    setSelectedDeploy(deploy);
    setSelectedResource(null);
    setBpmnXml('');
    setLoadingResources(true);
    try {
      const data = await bpmnFetch(`/deployments/${deploy.id}/resources`);
      setResources(Array.isArray(data) ? data : []);
    } catch {
      setResources([]);
    }
    setLoadingResources(false);
  }

  async function selectResource(resource: any) {
    setSelectedResource(resource);
    setBpmnXml('');
    const name: string = resource.name || resource.id || '';
    if (!name.endsWith('.bpmn')) return;
    setLoadingPreview(true);
    try {
      const xml = await bpmnFetchText(`/deployments/${selectedDeploy.id}/resources/${resource.id}/data`);
      setBpmnXml(xml);
    } catch {
      setBpmnXml('');
    }
    setLoadingPreview(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/deployments/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (selectedDeploy?.id === deleteTarget.id) {
        setSelectedDeploy(null);
        setResources([]);
        setSelectedResource(null);
        setBpmnXml('');
      }
      loadDeployments();
    } catch (e) {
      // ignore, just close
      setDeleteOpen(false);
    }
    setDeleting(false);
  }

  async function handleDeploy() {
    if (!deployFiles || deployFiles.length === 0) return;
    setDeploying(true);
    setDeployNotification(null);
    try {
      const formData = new FormData();
      if (deployName) formData.append('deployment-name', deployName);
      for (let i = 0; i < deployFiles.length; i++) {
        formData.append('file', deployFiles[i]);
      }
      const res = await fetch(`${BASE}/deployments`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setDeployNotification({ kind: 'success', message: '배포가 완료되었습니다.' });
      setDeployName('');
      setDeployFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDeployments();
    } catch (e: any) {
      setDeployNotification({ kind: 'error', message: '배포 실패: ' + (e?.message || '알 수 없는 오류') });
    }
    setDeploying(false);
  }

  const resourceName = (r: any): string => r.name || r.id || '';
  const isBpmn = (r: any) => resourceName(r).endsWith('.bpmn');
  const isDmn = (r: any) => resourceName(r).endsWith('.dmn');

  return (
    <>
      <PageHeader
        title="배포 관리"
        description="BPMN/DMN 파일 배포 목록 및 리소스 미리보기"
      />

      <div style={{ display: 'flex', height: 'calc(100vh - 200px)', marginTop: '1rem', border: '1px solid #e0e0e0' }}>
        {/* 좌측 패널 — 배포 목록 */}
        <div style={{ width: 280, borderRight: '1px solid #e0e0e0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f4f4' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>배포 목록</span>
            <Button kind="primary" onClick={() => { setDeployNotification(null); setNewDeployOpen(true); }}>
              새 배포
            </Button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingDeploys ? (
              <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6f6f6f' }}>로딩 중...</div>
            ) : deployments.length === 0 ? (
              <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6f6f6f' }}>배포가 없습니다.</div>
            ) : (
              deployments.map((deploy) => {
                const isSelected = selectedDeploy?.id === deploy.id;
                const displayName = deploy.name || deploy.id?.slice(0, 12) || '(이름 없음)';
                return (
                  <div
                    key={deploy.id}
                    onClick={() => selectDeployment(deploy)}
                    style={{
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '3px solid #0f62fe' : '3px solid transparent',
                      background: isSelected ? '#e8f0fe' : '#fff',
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', wordBreak: 'break-all' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6f6f6f', marginBottom: '0.125rem' }}>{formatDate(deploy.deploymentTime)}</div>
                    {deploy.source && (
                      <div style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>Source: {deploy.source}</div>
                    )}
                    {deploy.tenantId && (
                      <div style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>Tenant ID: {deploy.tenantId}</div>
                    )}
                    <div style={{ marginTop: '0.5rem' }}>
                      <Button
                        kind="danger--ghost"
                       
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(deploy);
                          setDeleteOpen(true);
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 중앙 패널 — 리소스 목록 */}
        <div style={{ width: 250, borderRight: '1px solid #e0e0e0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>리소스</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedDeploy ? (
              <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6f6f6f' }}>배포를 선택하세요</div>
            ) : loadingResources ? (
              <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6f6f6f' }}>로딩 중...</div>
            ) : resources.length === 0 ? (
              <div style={{ padding: '1rem', fontSize: '0.8125rem', color: '#6f6f6f' }}>리소스가 없습니다.</div>
            ) : (
              resources.map((res) => {
                const isSelected = selectedResource?.id === res.id;
                return (
                  <div
                    key={res.id}
                    onClick={() => selectResource(res)}
                    style={{
                      padding: '0.625rem 1rem',
                      borderBottom: '1px solid #e0e0e0',
                      cursor: 'pointer',
                      background: isSelected ? '#e8f0fe' : '#fff',
                      fontSize: '0.8125rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {resourceName(res)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 패널 — 미리보기 */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>미리보기</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
            {!selectedResource ? (
              <div style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>리소스를 선택하세요</div>
            ) : loadingPreview ? (
              <div style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>로딩 중...</div>
            ) : isBpmn(selectedResource) ? (
              bpmnXml ? (
                <BpmnViewer xml={bpmnXml} height="calc(100vh - 320px)" />
              ) : (
                <div style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>BPMN 데이터를 불러올 수 없습니다.</div>
              )
            ) : isDmn(selectedResource) ? (
              <div style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>DMN 뷰어는 추후 지원 예정입니다.</div>
            ) : (
              <div style={{ color: '#6f6f6f', fontSize: '0.875rem' }}>미리보기를 지원하지 않는 파일 형식입니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 Modal */}
      <Modal
        open={deleteOpen}
        danger
        modalHeading="배포 삭제"
        primaryButtonText="삭제"
        secondaryButtonText="취소"
        primaryButtonDisabled={deleting}
        onRequestSubmit={handleDelete}
        onRequestClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onSecondarySubmit={() => { setDeleteOpen(false); setDeleteTarget(null); }}
      >
        <p style={{ fontSize: '0.875rem' }}>
          배포 <strong>{deleteTarget?.name || deleteTarget?.id?.slice(0, 12)}</strong>을(를) 삭제하시겠습니까?
          이 작업은 되돌릴 수 없습니다.
        </p>
      </Modal>

      {/* 새 배포 Modal */}
      <Modal
        open={newDeployOpen}
        modalHeading="새 배포"
        primaryButtonText="배포"
        secondaryButtonText="취소"
        primaryButtonDisabled={deploying || !deployFiles || deployFiles.length === 0}
        onRequestSubmit={handleDeploy}
        onRequestClose={() => setNewDeployOpen(false)}
        onSecondarySubmit={() => setNewDeployOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {deployNotification && (
            <InlineNotification
              kind={deployNotification.kind}
              title={deployNotification.message}
              hideCloseButton
            />
          )}
          <TextInput
            id="deployment-name"
            labelText="배포 이름"
            placeholder="배포 이름을 입력하세요"
            value={deployName}
            onChange={(e) => setDeployName(e.target.value)}
          />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', color: '#525252' }}>
              파일 선택 (.bpmn, .dmn)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".bpmn,.dmn"
              multiple
              onChange={(e) => setDeployFiles(e.target.files)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #8d8d8d',
                background: '#f4f4f4',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            />
            {deployFiles && deployFiles.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#525252' }}>
                선택된 파일: {Array.from(deployFiles).map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
