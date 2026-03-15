// @ts-nocheck
/**
 * AI Pipeline — LiteLLM Service 라우팅 관리
 * Service(그룹)에 여러 모델을 연결하여 로드밸런싱/폴백을 설정합니다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Button, Tag, Modal, TextInput, InlineNotification,
  InlineLoading, DataTable, Table, TableHead, TableRow,
  TableHeader, TableBody, TableCell, Accordion, AccordionItem,
} from '@carbon/react';
import { Add, TrashCan, Renew, ChevronDown } from '@carbon/icons-react';
import { aiApi } from '../../api/ai';
import type { ModelInfo } from '../../api/ai';
import { buildServiceGroups, buildPoolMap, getProvider } from './utils/pipelineData';

export default function AIPipelinePage() {
  const [models,  setModels]  = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Add service modal
  const [showAddSvc, setShowAddSvc] = useState(false);
  const [svcName,    setSvcName]    = useState('');

  // Add model to service modal
  const [showAddToSvc, setShowAddToSvc]   = useState(false);
  const [targetSvc,    setTargetSvc]      = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [saving,        setSaving]        = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.getModelsInfo();
      setModels(res?.data || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const serviceGroups = buildServiceGroups(models);
  const poolMap       = buildPoolMap(models);

  // 서비스에 연결되지 않은 독립 모델 목록
  const poolModels = Object.entries(poolMap)
    .filter(([, e]) => e.directId !== null)
    .map(([actual, e]) => ({ actual, ...e }));

  const serviceNames  = Object.keys(serviceGroups).sort();
  const poolActuals   = Object.keys(poolMap)
    .filter(k => poolMap[k].directId !== null)
    .sort();

  const handleRemoveFromService = async (svcName: string, modelId: string) => {
    if (!confirm(`"${svcName}"에서 모델 연결을 제거하시겠습니까?`)) return;
    try {
      await aiApi.removeModelFromGroup(modelId);
      load();
    } catch (e: any) {
      alert('실패: ' + (e?.message || String(e)));
    }
  };

  const handleAddToService = async () => {
    if (!targetSvc || !selectedModel) return;
    setSaving(true);
    try {
      await aiApi.addModelToGroup(targetSvc, selectedModel);
      setShowAddToSvc(false);
      setSelectedModel('');
      load();
    } catch (e: any) {
      alert('실패: ' + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async () => {
    const n = svcName.trim();
    if (!n) return;
    // LiteLLM에서 Service는 모델을 추가할 때 자동 생성됨
    // 바로 "모델 추가" 모달로 연결
    setShowAddSvc(false);
    setSvcName('');
    setTargetSvc(n);
    setSelectedModel('');
    setShowAddToSvc(true);
  };

  const handleDeleteService = async (name: string) => {
    const items = serviceGroups[name] || [];
    if (!confirm(`서비스 "${name}"의 모델 연결 ${items.length}개를 전부 제거하시겠습니까?`)) return;
    try {
      for (const item of items) {
        if (item.model_id) await aiApi.removeModelFromGroup(item.model_id);
      }
      load();
    } catch (e: any) {
      alert('실패: ' + (e?.message || String(e)));
    }
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>AI Pipeline</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            LiteLLM Service 라우팅 — 여러 모델을 그룹화하여 로드밸런싱/폴백 설정
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" hasIconOnly renderIcon={Renew} iconDescription="새로고침" onClick={load} />
          <Button kind="primary" renderIcon={Add} onClick={() => { setShowAddSvc(true); setSvcName(''); }}>
            Service 생성
          </Button>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error" title="오류" subtitle={error} lowContrast
          style={{ marginBottom: 16 }}
          onCloseButtonClick={() => setError('')}
        />
      )}

      {loading ? (
        <InlineLoading description="파이프라인 로딩 중..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* ── 왼쪽: Services ── */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)', marginBottom: 12 }}>
              Services ({serviceNames.length})
            </div>

            {serviceNames.length === 0 ? (
              <div style={{
                background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)',
                padding: '48px', textAlign: 'center',
              }}>
                <p style={{ color: 'var(--cds-text-secondary)', fontSize: '14px', marginBottom: 8 }}>
                  Service가 없습니다
                </p>
                <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', marginBottom: 24 }}>
                  Service는 여러 모델을 묶어 로드밸런싱 및 폴백 라우팅을 제공합니다.<br/>
                  Agent는 Service 이름으로 모델을 호출합니다.
                </p>
                <Button kind="primary" renderIcon={Add} onClick={() => setShowAddSvc(true)}>
                  첫 Service 생성
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {serviceNames.map(svc => {
                  const items = serviceGroups[svc] || [];
                  return (
                    <div key={svc} style={{
                      background: 'var(--cds-layer-01)',
                      border: '1px solid var(--cds-border-subtle-00)',
                    }}>
                      {/* Service header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--cds-border-subtle-00)',
                        background: 'var(--cds-layer-02)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                            {svc}
                          </code>
                          <Tag type="blue">{items.length}개 모델</Tag>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button
                            kind="ghost" size="sm" renderIcon={Add}
                            onClick={() => { setTargetSvc(svc); setSelectedModel(''); setShowAddToSvc(true); }}
                          >
                            모델 추가
                          </Button>
                          <Button
                            kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                            iconDescription="Service 삭제"
                            onClick={() => handleDeleteService(svc)}
                          />
                        </div>
                      </div>

                      {/* Model list */}
                      <div>
                        {items.map((item, idx) => {
                          const prov = getProvider(item.actual);
                          return (
                            <div key={item.model_id || idx} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 16px',
                              borderBottom: idx < items.length - 1 ? '1px solid var(--cds-border-subtle-00)' : 'none',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {/* 우선순위 표시 */}
                                <span style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  background: idx === 0 ? '#0f62fe' : 'var(--cds-layer-03)',
                                  color: idx === 0 ? '#fff' : 'var(--cds-text-secondary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.6875rem', fontWeight: 600, flexShrink: 0,
                                }}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div style={{ fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace" }}>
                                    {item.actual}
                                  </div>
                                  <div style={{ fontSize: '0.6875rem', color: prov.color, marginTop: 1 }}>
                                    {prov.label}
                                    {idx === 0 && <span style={{ color: 'var(--cds-text-secondary)', marginLeft: 6 }}>Primary</span>}
                                    {idx > 0  && <span style={{ color: 'var(--cds-text-secondary)', marginLeft: 6 }}>Fallback</span>}
                                  </div>
                                </div>
                              </div>
                              <Button
                                kind="ghost" size="sm" hasIconOnly renderIcon={TrashCan}
                                iconDescription="연결 제거"
                                onClick={() => handleRemoveFromService(svc, item.model_id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 오른쪽: 독립 모델 풀 ── */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--cds-text-secondary)', marginBottom: 12 }}>
              등록된 모델 ({poolActuals.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {poolActuals.length === 0 ? (
                <div style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', padding: '16px', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  등록된 모델 없음<br/>
                  <span style={{ fontSize: '12px' }}>AI Models 페이지에서 먼저 등록하세요.</span>
                </div>
              ) : poolActuals.map(actual => {
                const entry = poolMap[actual];
                const prov  = getProvider(actual);
                return (
                  <div key={actual} style={{
                    background: 'var(--cds-layer-01)',
                    border: '1px solid var(--cds-border-subtle-00)',
                    padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>
                      {actual.split('/').pop() || actual}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: prov.color }}>{prov.label}</div>
                    {entry.usedBy.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {entry.usedBy.map(s => <Tag key={s} type="blue" size="sm">{s}</Tag>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 사용 안내 */}
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)',
              borderLeft: '3px solid var(--cds-interactive)',
              fontSize: '0.75rem', color: 'var(--cds-text-secondary)', lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--cds-text-primary)', display: 'block', marginBottom: 4 }}>라우팅 방식</strong>
              <div>① Primary 모델 우선 호출</div>
              <div>② 실패 시 Fallback 순서대로</div>
              <div>③ Agent는 Service 이름으로 호출</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Service Modal ── */}
      <Modal
        open={showAddSvc}
        onRequestClose={() => setShowAddSvc(false)}
        onRequestSubmit={handleCreateService}
        modalHeading="Service 생성"
        primaryButtonText="다음 (모델 추가)"
        secondaryButtonText="취소"
        primaryButtonDisabled={!svcName.trim()}
      >
        <div style={{ paddingTop: 8 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: 16 }}>
            Service 이름은 Agent가 LLM을 호출할 때 사용하는 식별자입니다.
          </p>
          <TextInput
            id="svc-name" labelText="Service 이름"
            placeholder="polyon-default, polyon-coding, polyon-embed ..."
            value={svcName}
            onChange={e => setSvcName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateService()}
            helperText="영문 소문자, 숫자, 하이픈만 사용"
          />
        </div>
      </Modal>

      {/* ── Add Model to Service Modal ── */}
      <Modal
        open={showAddToSvc}
        onRequestClose={() => setShowAddToSvc(false)}
        onRequestSubmit={handleAddToService}
        modalHeading={`모델 추가 → ${targetSvc}`}
        primaryButtonText={saving ? '추가 중...' : '추가'}
        secondaryButtonText="취소"
        primaryButtonDisabled={saving || !selectedModel}
      >
        <div style={{ paddingTop: 8 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: 16 }}>
            추가된 순서대로 Primary → Fallback이 결정됩니다.
          </p>
          {poolActuals.length === 0 ? (
            <InlineNotification
              kind="warning" title="등록된 모델 없음"
              subtitle="AI Models 페이지에서 먼저 모델을 등록하세요."
              lowContrast hideCloseButton
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {poolActuals.map(actual => (
                <label key={actual} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: selectedModel === actual ? 'var(--cds-layer-selected-01)' : 'var(--cds-layer-01)',
                  border: `1px solid ${selectedModel === actual ? 'var(--cds-interactive)' : 'var(--cds-border-subtle-00)'}`,
                  cursor: 'pointer',
                }}>
                  <input
                    type="radio" name="model-select"
                    value={actual}
                    checked={selectedModel === actual}
                    onChange={() => setSelectedModel(actual)}
                  />
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace" }}>{actual}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)' }}>
                      {getProvider(actual).label}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
