// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api/client';
import { Tag, Button, SkeletonText, Modal, TextInput, TextArea, Select, SelectItem, InlineNotification } from '@carbon/react';
import { Add, Renew, CheckmarkFilled, TrashCan, Edit, Time } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function duration(since) {
  if (!since) return '';
  const secs = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs / 60) + 'm';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ' + Math.floor((secs % 3600) / 60) + 'm';
  return Math.floor(secs / 86400) + 'd ' + Math.floor((secs % 86400) / 3600) + 'h';
}

function SeverityTag({ severity }) {
  const map = { critical: 'red', warning: 'warm-gray', info: 'blue' };
  return <Tag type={map[severity] || 'gray'}>{severity}</Tag>;
}

function StateTag({ state }) {
  if (state === 'firing') return <Tag type="red">FIRING</Tag>;
  if (state === 'pending') return <Tag type="warm-gray">PENDING</Tag>;
  return <Tag type="gray">{state}</Tag>;
}

function SummaryCards({ firing, pending, total, rulesCount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      {[
        { label: '활성 알림', value: total, color: total === 0 ? 'var(--cds-support-success)' : 'var(--cds-support-error)', sub: '현재 알림 중인 항목' },
        { label: 'Firing', value: firing, color: firing === 0 ? 'var(--cds-support-success)' : 'var(--cds-support-error)', sub: '임계값 초과', accent: 'var(--cds-support-error)' },
        { label: 'Pending', value: pending, color: pending === 0 ? 'var(--cds-support-success)' : 'var(--cds-support-warning)', sub: '대기 중 (for 조건)', accent: 'var(--cds-support-warning)' },
        { label: '전체 규칙', value: rulesCount, color: 'var(--cds-text-primary)', sub: '등록된 alerting rules', accent: 'var(--cds-border-subtle-00)' },
      ].map((c, i) => (
        <div key={i} style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', borderLeft: c.accent ? `3px solid ${c.accent}` : undefined, padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>{c.label}</div>
          <div style={{ fontSize: '32px', fontWeight: 300, color: c.color, lineHeight: 1 }}>{c.value ?? '—'}</div>
          <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '6px' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default function MonitoringAlertsPage() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [ruleGroups, setRuleGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editState, setEditState] = useState({ group: null, alert: null, data: null });
  const [form, setForm] = useState({ group: '', groupNew: '', alertName: '', expr: '', for: '', severity: 'warning', summary: '', description: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedExprs, setExpandedExprs] = useState({});
  const timerRef = useRef(null);

  const load = async () => {
    await Promise.all([loadActive(), loadRules()]);
  };

  const loadActive = async () => {
    try {
      const res = await apiFetch('/system/prometheus/alerts') as any;
      const data = await res.json();
      setActiveAlerts((data.data?.alerts) || []);
    } catch {
      setActiveAlerts([]);
    }
    setLoading(false);
  };

  const loadRules = async () => {
    try {
      const res = await apiFetch('/alert-rules') as any;
      const data = await res.json();
      setRuleGroups(data.groups || []);
    } catch {
      setRuleGroups([]);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 30000);
    return () => clearInterval(timerRef.current);
  }, []);

  const firing = activeAlerts.filter(a => a.state === 'firing');
  const pending = activeAlerts.filter(a => a.state === 'pending');
  const totalRules = ruleGroups.reduce((s, g) => s + (g.rules?.length || 0), 0);

  const openModal = (editGroup = null, editAlert = null, ruleData = null) => {
    setEditState({ group: editGroup, alert: editAlert, data: ruleData });
    setForm({
      group: editGroup || '',
      groupNew: '',
      alertName: ruleData?.alert || '',
      expr: ruleData?.expr || '',
      for: ruleData?.for || '',
      severity: ruleData?.labels?.severity || 'warning',
      summary: ruleData?.annotations?.summary || '',
      description: ruleData?.annotations?.description || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const saveRule = async () => {
    let group = form.group === '__new__' ? form.groupNew.trim() : form.group;
    if (!group) { setFormError('그룹을 선택하거나 입력하세요.'); return; }
    if (!form.alertName) { setFormError('알림 이름은 필수입니다.'); return; }
    if (!form.expr) { setFormError('PromQL 표현식은 필수입니다.'); return; }

    const rule = {
      alert: form.alertName,
      expr: form.expr,
      labels: { severity: form.severity },
      annotations: {},
    };
    if (form.for) rule.for = form.for;
    if (form.summary) rule.annotations.summary = form.summary;
    if (form.description) rule.annotations.description = form.description;

    setSaving(true);
    try {
      let res;
      if (editState.alert) {
        res = await apiFetch(`/alert-rules/${encodeURIComponent(editState.group)}/${encodeURIComponent(editState.alert)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rule),
        });
      } else {
        res = await apiFetch('/alert-rules', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group, rule }),
        });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || '저장 실패'); return; }
      setModalOpen(false);
      await loadRules();
    } catch (e) {
      setFormError('오류: ' + e.message);
    }
    setSaving(false);
  };

  const deleteRule = async (groupName, alertName) => {
    if (!confirm(`"${alertName}" 규칙을 삭제하시겠습니까?`)) return;
    await apiFetch(`/alert-rules/${encodeURIComponent(groupName)}/${encodeURIComponent(alertName)}`, { method: 'DELETE' });
    await loadRules();
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Alerts</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>규칙 기반 임계값 감시</p>
        </div>
        <Button kind="ghost" renderIcon={Renew} onClick={load}>새로고침</Button>
      </div>

      <SummaryCards firing={firing.length} pending={pending.length} total={activeAlerts.length} rulesCount={totalRules} />

      {/* Active Alerts */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>활성 알림 (Prometheus)</div>
        {loading ? <SkeletonText paragraph /> : activeAlerts.length === 0 ? (
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '48px 24px', textAlign: 'center' }}>
            <CheckmarkFilled size={48} style={{ color: 'var(--cds-support-success)' }} />
            <div style={{ fontSize: '18px', fontWeight: 400, marginTop: '16px' }}>모든 서비스가 정상입니다</div>
            <div style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', marginTop: '8px' }}>현재 Firing 또는 Pending 상태의 알림이 없습니다.</div>
          </div>
        ) : (
          <div>
            {[...firing, ...pending].map((a, i) => {
              const alertName = a.labels?.alertname || 'Unknown';
              const isFiring = a.state === 'firing';
              const barColor = isFiring ? 'var(--cds-support-error)' : 'var(--cds-support-warning)';
              return (
                <div key={i} style={{ display: 'flex', background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', marginBottom: '6px', overflow: 'hidden' }}>
                  <div style={{ width: '4px', flexShrink: 0, background: barColor }} />
                  <div style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{alertName}</span>
                      <StateTag state={a.state} />
                      {a.labels?.severity && <SeverityTag severity={a.labels.severity} />}
                    </div>
                    {a.annotations?.summary && <div style={{ fontSize: '12px', marginTop: '6px' }}>{a.annotations.summary}</div>}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '11px', color: 'var(--cds-text-secondary)' }}>
                      <span>Since: <strong>{fmtDate(a.activeAt)}</strong></span>
                      {a.activeAt && <span>Duration: <strong>{duration(a.activeAt)}</strong></span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Rules */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>알림 규칙</div>
          <Button kind="primary" renderIcon={Add} onClick={() => openModal()}>규칙 추가</Button>
        </div>

        {ruleGroups.length === 0 ? (
          <div style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--cds-text-secondary)' }}>등록된 알림 규칙이 없습니다.</div>
            <Button kind="primary" renderIcon={Add} style={{ marginTop: '12px' }} onClick={() => openModal()}>첫 규칙 추가</Button>
          </div>
        ) : (
          ruleGroups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: '8px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'var(--cds-layer-02)', userSelect: 'none' }}>
                <div
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [gi]: !prev[gi] }))}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{g.name}</span>
                  <Tag type="gray">{g.rules?.length || 0}</Tag>
                </div>
                <Button kind="ghost" renderIcon={Add} onClick={() => openModal(g.name)} style={{ fontSize: '11px' }}>규칙 추가</Button>
              </div>
              {expandedGroups[gi] !== false && (
                <div>
                  {(g.rules || []).map((r, ri) => {
                    const exprKey = `${gi}-${ri}`;
                    const sevMap = { critical: 'red', warning: 'warm-gray' };
                    return (
                      <div key={ri} style={{ borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', fontSize: '12px' }}>
                          <div
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                            onClick={() => setExpandedExprs(prev => ({ ...prev, [exprKey]: !prev[exprKey] }))}
                          >
                            <span style={{ width: '7px', height: '7px', background: 'var(--cds-border-strong)', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontWeight: 500 }}>{r.alert}</span>
                            {r.annotations?.summary && <span style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.annotations.summary}</span>}
                            {r.labels?.severity && <Tag type={sevMap[r.labels.severity] || 'gray'}>{r.labels.severity}</Tag>}
                            {r.for && <span style={{ fontSize: '10px', color: 'var(--cds-text-secondary)', whiteSpace: 'nowrap' }}>for {r.for}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <Button kind="ghost" hasIconOnly renderIcon={Edit} iconDescription="편집" onClick={() => openModal(g.name, r.alert, r)} />
                            <Button kind="ghost" hasIconOnly renderIcon={TrashCan} iconDescription="삭제" onClick={() => deleteRule(g.name, r.alert)} style={{ color: 'var(--cds-support-error)' }} />
                          </div>
                        </div>
                        {expandedExprs[exprKey] && (
                          <div style={{ padding: '0 12px 10px 29px' }}>
                            <pre style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--cds-text-secondary)', background: 'var(--cds-layer-02)', padding: '8px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{r.expr}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rule Modal */}
      <Modal
        open={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={saveRule}
        modalHeading={editState.alert ? '알림 규칙 편집' : '알림 규칙 추가'}
        primaryButtonText={saving ? '저장 중...' : '저장'}
        secondaryButtonText="취소"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          <Select id="rm-group" labelText="그룹" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
            <SelectItem value="" text="— 그룹 선택 —" />
            {ruleGroups.map(g => <SelectItem key={g.name} value={g.name} text={g.name} />)}
            <SelectItem value="__new__" text="+ 새 그룹 만들기" />
          </Select>
          {form.group === '__new__' && (
            <TextInput id="rm-group-new" labelText="새 그룹명" placeholder="새 그룹명 입력" value={form.groupNew} onChange={e => setForm(f => ({ ...f, groupNew: e.target.value }))} />
          )}
          <TextInput id="rm-alert" labelText="알림 이름 *" placeholder="예: HighMemoryUsage" value={form.alertName} onChange={e => setForm(f => ({ ...f, alertName: e.target.value }))} />
          <TextArea id="rm-expr" labelText="PromQL 표현식 *" placeholder="예: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100) > 80" value={form.expr} onChange={e => setForm(f => ({ ...f, expr: e.target.value }))} rows={3} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextInput id="rm-for" labelText="지속 시간 (for)" placeholder="예: 5m, 1h" value={form.for} onChange={e => setForm(f => ({ ...f, for: e.target.value }))} />
            <Select id="rm-severity" labelText="Severity" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
              <SelectItem value="critical" text="critical" />
              <SelectItem value="warning" text="warning" />
              <SelectItem value="info" text="info" />
            </Select>
          </div>
          <TextInput id="rm-summary" labelText="Summary" placeholder="간단한 설명" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          <TextInput id="rm-desc" labelText="Description (선택)" placeholder="상세 설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          {formError && (
            <InlineNotification kind="error" title={formError} hideCloseButton />
          )}
        </div>
      </Modal>
    </div>
  );
}
