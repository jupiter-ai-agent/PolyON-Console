// @ts-nocheck
/**
 * AI Models — Visual Patch Bay
 * Left: Services | Center: Connection Canvas (SVG lines) | Right: Model Pool
 * Drag from service port → model port to connect
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tile, Tag, Modal, TextInput, Select, SelectItem, InlineNotification } from '@carbon/react';
import { Add, TrashCan, Renew, Close, ChevronUp } from '@carbon/icons-react';
import { aiApi } from '../../api/ai';
import type { ModelInfo } from '../../api/ai';
import { buildServiceGroups, buildPoolMap, getProvider, MODEL_META, MODEL_PRESETS, AI_PROVIDERS } from './utils/pipelineData';
import type { ProviderInfo, ServiceItem, PoolEntry } from './utils/pipelineData';

/* ── Helpers ── */
function shortName(actual: string): string {
  return actual.includes('/') ? actual.split('/').pop()! : actual;
}
function costLabel(actual: string): string {
  const key = shortName(actual);
  const m = MODEL_META[key];
  if (!m) return '';
  return `${m.inputCost} / ${m.outputCost}`;
}
function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

/* ── Port positions (for SVG lines) ── */
interface PortPos { x: number; y: number }

/* ════════════════════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════════════════════ */
export default function AIPipelinePage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModel, setShowAddModel] = useState(false);
  const [showAddService, setShowAddService] = useState(false);

  // Register model form
  const [regProvider, setRegProvider] = useState('openai');
  const [regPreset, setRegPreset] = useState('');
  const [regModelId, setRegModelId] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Add service form
  const [newSvcName, setNewSvcName] = useState('');

  // Drag connection state
  const [dragging, setDragging] = useState<{ from: 'service' | 'model'; key: string; startX: number; startY: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Port refs for SVG
  const svcPortRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const modelPortRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [, forceUpdate] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.getModelsInfo();
      setModels(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Re-render for port positions after data loads
  useEffect(() => { if (!loading) setTimeout(() => forceUpdate(k => k + 1), 50); }, [loading, models]);

  const serviceGroups = buildServiceGroups(models);
  const poolMap = buildPoolMap(models);

  const serviceNames = Object.keys(serviceGroups).sort();
  const modelActuals = Object.keys(poolMap).sort();

  /* ── Get port positions relative to canvas ── */
  function getPortPos(el: HTMLDivElement | null): PortPos | null {
    if (!el || !canvasRef.current) return null;
    const cr = canvasRef.current.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return { x: er.left + er.width / 2 - cr.left, y: er.top + er.height / 2 - cr.top };
  }

  /* ── Build connection lines ── */
  function getConnections(): { svc: string; actual: string; isPrimary: boolean }[] {
    const conns: { svc: string; actual: string; isPrimary: boolean }[] = [];
    for (const [svcName, items] of Object.entries(serviceGroups)) {
      items.forEach((item, idx) => {
        conns.push({ svc: svcName, actual: item.actual, isPrimary: idx === 0 });
      });
    }
    return conns;
  }

  const connections = getConnections();

  /* ── Drag handlers ── */
  const handlePortMouseDown = (from: 'service' | 'model', key: string, e: React.MouseEvent) => {
    e.preventDefault();
    const cr = canvasRef.current?.getBoundingClientRect();
    if (!cr) return;
    setDragging({ from, key, startX: e.clientX - cr.left, startY: e.clientY - cr.top });
    setDragPos({ x: e.clientX - cr.left, y: e.clientY - cr.top });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const cr = canvasRef.current?.getBoundingClientRect();
      if (!cr) return;
      setDragPos({ x: e.clientX - cr.left, y: e.clientY - cr.top });
    };
    const handleUp = async (e: MouseEvent) => {
      // Find target port
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const portEl = target?.closest('[data-port-type]') as HTMLElement | null;

      if (portEl && dragging) {
        const targetType = portEl.dataset.portType;
        const targetKey = portEl.dataset.portKey;

        if (targetType && targetKey) {
          if (dragging.from === 'service' && targetType === 'model') {
            // Connect service → model
            try {
              await aiApi.addModelToGroup(dragging.key, targetKey);
              load();
            } catch (err) {
              alert('연결 실패: ' + (err instanceof Error ? err.message : String(err)));
            }
          } else if (dragging.from === 'model' && targetType === 'service') {
            // Connect model → service
            try {
              await aiApi.addModelToGroup(targetKey, dragging.key);
              load();
            } catch (err) {
              alert('연결 실패: ' + (err instanceof Error ? err.message : String(err)));
            }
          }
        }
      }
      setDragging(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, load]);

  /* ── Actions ── */
  const handleRemoveConnection = useCallback(async (svcName: string, modelId: string) => {
    if (!confirm(`"${svcName}"에서 이 모델 연결을 제거하시겠습니까?`)) return;
    try {
      await aiApi.removeModelFromGroup(modelId);
      load();
    } catch (e) {
      alert('실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [load]);

  const handleDeleteService = useCallback(async (name: string) => {
    if (!confirm(`서비스 "${name}"을 삭제하시겠습니까?`)) return;
    try { await aiApi.deleteService(name); load(); } catch (e) { alert('실패: ' + (e instanceof Error ? e.message : String(e))); }
  }, [load]);

  const handleRegisterModel = useCallback(async () => {
    if (!regModelId.trim()) return;
    setRegLoading(true);
    try {
      const sn = shortName(regModelId.trim());
      await aiApi.registerModel(sn, regModelId.trim());
      setShowAddModel(false); setRegModelId(''); setRegPreset('');
      load();
    } catch (e) { alert('실패: ' + (e instanceof Error ? e.message : String(e))); }
    finally { setRegLoading(false); }
  }, [regModelId, load]);

  const handleAddService = useCallback(async () => {
    const n = newSvcName.trim();
    if (!n) return;
    setShowAddService(false); setNewSvcName('');
    alert(`서비스 "${n}" — 포트를 드래그하여 모델과 연결하세요.`);
  }, [newSvcName]);

  const handlePromote = useCallback(async (svcName: string, modelId: string) => {
    const items = serviceGroups[svcName];
    if (!items || items.length < 2) return;
    const idx = items.findIndex(i => i.model_id === modelId);
    if (idx <= 0) return;
    try {
      const reordered = [items[idx], ...items.slice(0, idx), ...items.slice(idx + 1)];
      for (const item of items) { if (item.model_id) await aiApi.removeModelFromGroup(item.model_id); }
      for (const item of reordered) { await aiApi.addModelToGroup(svcName, item.actual); }
      load();
    } catch (e) { alert('실패: ' + (e instanceof Error ? e.message : String(e))); }
  }, [serviceGroups, load]);

  const presets = MODEL_PRESETS[regProvider] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)', margin: '-1.5rem -2rem', overflow: 'hidden', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* ── Toolbar ── */}
      <div style={{
        height: 48, minHeight: 48,
        borderBottom: '1px solid var(--cds-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--cds-layer)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>AI Models</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="tertiary" renderIcon={Add} onClick={() => setShowAddService(true)}>Service</Button>
          <Button kind="primary" renderIcon={Add} onClick={() => setShowAddModel(true)}>Model</Button>
          <Button kind="ghost" renderIcon={Renew} hasIconOnly iconDescription="Refresh" onClick={load} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 16px' }}>
          <InlineNotification kind="error" title="Error" subtitle={error} lowContrast hideCloseButton />
        </div>
      )}

      {/* ── Body: 3-column patch bay ── */}
      <div ref={canvasRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ─ SVG overlay (full area) ─ */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}>
          {/* Existing connections */}
          {connections.map((conn, idx) => {
            const sp = getPortPos(svcPortRefs.current[conn.svc]);
            const mp = getPortPos(modelPortRefs.current[conn.actual]);
            if (!sp || !mp) return null;
            const cpx1 = sp.x + (mp.x - sp.x) * 0.4;
            const cpx2 = sp.x + (mp.x - sp.x) * 0.6;
            return (
              <g key={`${conn.svc}-${conn.actual}-${idx}`}>
                <path
                  d={`M ${sp.x} ${sp.y} C ${cpx1} ${sp.y}, ${cpx2} ${mp.y}, ${mp.x} ${mp.y}`}
                  fill="none"
                  stroke={conn.isPrimary ? '#0f62fe' : '#a8a8a8'}
                  strokeWidth={conn.isPrimary ? 2.5 : 1.5}
                  strokeDasharray={conn.isPrimary ? 'none' : '6 3'}
                />
                {/* Delete button on midpoint */}
                <g
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={() => {
                    const item = serviceGroups[conn.svc]?.find(i => i.actual === conn.actual);
                    if (item) handleRemoveConnection(conn.svc, item.model_id);
                  }}
                >
                  <circle cx={(sp.x + mp.x) / 2} cy={(sp.y + mp.y) / 2} r={9} fill="#fff" stroke="#da1e28" strokeWidth={1.5} />
                  <text x={(sp.x + mp.x) / 2} y={(sp.y + mp.y) / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#da1e28">×</text>
                </g>
              </g>
            );
          })}
          {/* Dragging line */}
          {dragging && (() => {
            const startEl = dragging.from === 'service'
              ? svcPortRefs.current[dragging.key]
              : modelPortRefs.current[dragging.key];
            const sp = getPortPos(startEl);
            if (!sp) return null;
            return (
              <path
                d={`M ${sp.x} ${sp.y} L ${dragPos.x} ${dragPos.y}`}
                fill="none" stroke="#0f62fe" strokeWidth={2} strokeDasharray="4 4" opacity={0.7}
              />
            );
          })()}
        </svg>

        {/* Center background pattern */}
        <div style={{
          position: 'absolute', left: 268, right: 288, top: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle, #d9d9d9 1px, transparent 1px)',
          backgroundSize: '20px 20px', opacity: 0.4, pointerEvents: 'none', zIndex: 1,
        }} />
        {connections.length === 0 && !loading && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            color: 'var(--cds-text-secondary)', fontSize: '0.8125rem', textAlign: 'center',
            pointerEvents: 'none', zIndex: 1,
          }}>
            <p style={{ marginBottom: 4 }}>● 포트를 드래그하여 연결 ●</p>
            <p style={{ fontSize: '0.6875rem' }}>Service → Model</p>
          </div>
        )}

        {/* ─ Left: Services ─ */}
        <div style={{ width: 260, flexShrink: 0, overflow: 'auto', padding: '16px 0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 3 }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 4 }}>
            Services ({serviceNames.length})
          </div>
          {serviceNames.map(svcName => {
            const items = serviceGroups[svcName];
            return (
              <div key={svcName} style={{
                background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)',
                padding: '10px 12px', position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{svcName}</span>
                  <Button kind="ghost" hasIconOnly renderIcon={TrashCan} iconDescription="Delete service" onClick={() => handleDeleteService(svcName)} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', marginBottom: 6 }}>
                  {items.length} model{items.length !== 1 ? 's' : ''} connected
                </div>
                {/* Service port (right side) */}
                <div
                  ref={el => svcPortRefs.current[svcName] = el}
                  data-port-type="service"
                  data-port-key={svcName}
                  onMouseDown={e => handlePortMouseDown('service', svcName, e)}
                  style={{
                    position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16,
                    background: '#0f62fe', border: '3px solid #fff',
                    boxShadow: '0 0 0 1px #0f62fe',
                    cursor: 'crosshair', zIndex: 5,
                  }}
                />
              </div>
            );
          })}
          {serviceNames.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>
              <p style={{ marginBottom: 8 }}>서비스 없음</p>
              <Button kind="tertiary" renderIcon={Add} onClick={() => setShowAddService(true)}>추가</Button>
            </div>
          )}
        </div>

        {/* ─ Center spacer ─ */}
        <div style={{ flex: 1, minWidth: 120 }} />

        {/* ─ Right: Model Pool ─ */}
        <div style={{ width: 280, flexShrink: 0, overflow: 'auto', padding: '16px 16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 3 }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: 4, paddingLeft: 16 }}>
            Models ({modelActuals.length})
          </div>
          {modelActuals.map(actual => {
            const entry = poolMap[actual];
            const prov = entry.prov;
            const key = shortName(actual);
            const meta = MODEL_META[key];
            const cost = costLabel(actual);

            return (
              <div key={actual} style={{
                background: 'var(--cds-layer)', border: '1px solid var(--cds-border-subtle)',
                padding: '10px 12px 10px 20px', position: 'relative',
              }}>
                {/* Model port (left side) */}
                <div
                  ref={el => modelPortRefs.current[actual] = el}
                  data-port-type="model"
                  data-port-key={actual}
                  onMouseDown={e => handlePortMouseDown('model', actual, e)}
                  style={{
                    position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16,
                    background: prov.color, border: '3px solid #fff',
                    boxShadow: `0 0 0 1px ${prov.color}`,
                    cursor: 'crosshair', zIndex: 5,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{key}</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--cds-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
                  <span style={{ color: prov.color, fontWeight: 500 }}>{prov.label}</span>
                  {meta && <span>{formatTokens(meta.maxTokens)} tokens</span>}
                  {cost && <span>{cost}</span>}
                </div>
                {entry.usedBy.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {entry.usedBy.map(s => <Tag key={s} type="blue">{s}</Tag>)}
                  </div>
                )}
              </div>
            );
          })}
          {modelActuals.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>
              <p style={{ marginBottom: 8 }}>모델 없음</p>
              <Button kind="primary" renderIcon={Add} onClick={() => setShowAddModel(true)}>등록</Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Register Model Modal ── */}
      <Modal
        open={showAddModel}
        onRequestClose={() => setShowAddModel(false)}
        onRequestSubmit={handleRegisterModel}
        modalHeading="Register Model"
        primaryButtonText={regLoading ? 'Registering...' : 'Register'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={regLoading || !regModelId.trim()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <Select id="reg-provider" labelText="Provider" value={regProvider}
            onChange={e => { setRegProvider(e.target.value); setRegPreset(''); setRegModelId(''); }}>
            {AI_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value} text={p.label} />)}
          </Select>
          {presets.length > 0 && (
            <Select id="reg-preset" labelText="Preset" value={regPreset}
              onChange={e => { setRegPreset(e.target.value); if (e.target.value) { const v = e.target.value; setRegModelId(regProvider === 'openai' ? v : (v.includes('/') ? v : `${regProvider}/${v}`)); } }}>
              <SelectItem value="" text="-- 직접 입력 --" />
              {presets.map(m => <SelectItem key={m} value={m} text={m} />)}
            </Select>
          )}
          <TextInput id="reg-model-id" labelText="Model ID (actual)" placeholder="openai/gpt-4o-mini"
            value={regModelId} onChange={e => setRegModelId(e.target.value)} helperText="Format: provider/model-name" />
        </div>
      </Modal>

      {/* ── Add Service Modal ── */}
      <Modal
        open={showAddService}
        onRequestClose={() => setShowAddService(false)}
        onRequestSubmit={handleAddService}
        modalHeading="Add Service"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!newSvcName.trim()}
      >
        <div style={{ paddingTop: 8 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: 16 }}>
            Service는 여러 모델을 그룹화하여 로드밸런싱/폴백 라우팅을 제공합니다.
          </p>
          <TextInput id="new-svc-name" labelText="Service Name" placeholder="polyon-coding"
            value={newSvcName} onChange={e => setNewSvcName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddService()}
            helperText="Agent가 이 이름으로 모델을 호출합니다." />
        </div>
      </Modal>
    </div>
  );
}
