// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button, TextInput, Select, SelectItem, InlineLoading, Tag } from '@carbon/react';
import { Key, Edit, Checkmark, Locked, Security as Shield, Renew } from  '@carbon/icons-react';
import { apiFetch } from '../../api/client';

function Row({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--cds-border-subtle-00)', fontSize: '13px' }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{value ?? '-'}</span>
    </div>
  );
}

export default function SecurityPoliciesPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editPwd, setEditPwd] = useState(false);
  const [editLock, setEditLock] = useState(false);
  const [pwdForm, setPwdForm] = useState({});
  const [lockForm, setLockForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/security/password-policy');
      const p = (data as any).policy || {};
      setPolicy(p);
      setPwdForm({
        min_length: p.min_length ?? 7,
        complexity: p.complexity ?? 'on',
        max_age_days: p.max_age_days ?? 0,
        min_age_days: p.min_age_days ?? 0,
        history_length: p.history_length ?? 0,
      });
      setLockForm({
        lockout_threshold: p.lockout_threshold ?? 0,
        lockout_duration: p.lockout_duration ?? 0,
        lockout_reset_after: p.lockout_reset_after ?? 0,
      });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const savePwd = async () => {
    setSaving(true);
    try {
      await apiFetch('/security/password-policy', {
        method: 'POST',
        body: JSON.stringify(pwdForm),
      });
      setEditPwd(false);
      await load();
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
    setSaving(false);
  };

  const saveLock = async () => {
    setSaving(true);
    try {
      await apiFetch('/security/password-policy', {
        method: 'POST',
        body: JSON.stringify(lockForm),
      });
      setEditLock(false);
      await load();
    } catch (e) {
      alert('저장 실패: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}><InlineLoading description="정책을 불러오는 중..." /></div>;
  if (error) return <div style={{ padding: '32px', color: 'var(--cds-support-error)' }}>{error}</div>;

  const p = policy || {};
  const complexityLabel = p.complexity === 'on' ? '활성 (대소문자 + 숫자 + 특수문자)' : p.complexity === 'off' ? '비활성' : p.complexity || '-';

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>보안 정책</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>도메인 패스워드 정책, 계정 잠금, Kerberos 인증 설정</p>
        </div>
        <Button kind="ghost" renderIcon={Renew} onClick={load}>새로고침</Button>
      </div>

      {/* Password Policy */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} /> 패스워드 정책
          </h4>
          {!editPwd && (
            <Button kind="ghost" renderIcon={Edit} onClick={() => setEditPwd(true)}>편집</Button>
          )}
        </div>

        {!editPwd ? (
          <div>
            <Row label="최소 길이" value={`${p.min_length ?? '-'}자`} />
            <Row label="복잡성 요구" value={complexityLabel} />
            <Row label="최대 수명 (만료)" value={`${p.max_age_days ?? '-'}일`} />
            <Row label="최소 변경 간격" value={`${p.min_age_days ?? '-'}일`} />
            <Row label="이전 비밀번호 재사용 금지" value={`최근 ${p.history_length ?? '-'}개`} />
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <TextInput id="f-min-len" labelText="최소 길이 (자)" type="number" value={pwdForm.min_length} onChange={e => setPwdForm(f => ({ ...f, min_length: e.target.value }))} />
              <Select id="f-complexity" labelText="복잡성 요구" value={pwdForm.complexity} onChange={e => setPwdForm(f => ({ ...f, complexity: e.target.value }))}>
                <SelectItem value="on" text="활성 (대소문자 + 숫자 + 특수문자)" />
                <SelectItem value="off" text="비활성" />
              </Select>
              <TextInput id="f-max-age" labelText="최대 수명 - 만료 (일)" type="number" value={pwdForm.max_age_days} onChange={e => setPwdForm(f => ({ ...f, max_age_days: e.target.value }))} helperText="0 = 만료 없음" />
              <TextInput id="f-min-age" labelText="최소 변경 간격 (일)" type="number" value={pwdForm.min_age_days} onChange={e => setPwdForm(f => ({ ...f, min_age_days: e.target.value }))} />
              <TextInput id="f-hist" labelText="이전 비밀번호 재사용 금지 (개)" type="number" value={pwdForm.history_length} onChange={e => setPwdForm(f => ({ ...f, history_length: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button kind="ghost" onClick={() => setEditPwd(false)}>취소</Button>
              <Button kind="primary" renderIcon={Checkmark} onClick={savePwd} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Account Lockout */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Locked size={20} /> 계정 잠금 정책
          </h4>
          {!editLock && (
            <Button kind="ghost" renderIcon={Edit} onClick={() => setEditLock(true)}>편집</Button>
          )}
        </div>

        {!editLock ? (
          <div>
            <Row label="잠금 임계값" value={`${p.lockout_threshold ?? '-'}회 실패`} />
            <Row label="잠금 기간" value={`${p.lockout_duration ?? '-'}분`} />
            <Row label="실패 카운터 초기화" value={`${p.lockout_reset_after ?? '-'}분 후`} />
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <TextInput id="f-lock-thresh" labelText="잠금 임계값 (회)" type="number" value={lockForm.lockout_threshold} onChange={e => setLockForm(f => ({ ...f, lockout_threshold: e.target.value }))} helperText="0 = 잠금 비활성" />
              <TextInput id="f-lock-dur" labelText="잠금 기간 (분)" type="number" value={lockForm.lockout_duration} onChange={e => setLockForm(f => ({ ...f, lockout_duration: e.target.value }))} helperText="0 = 수동 해제만" />
              <TextInput id="f-lock-reset" labelText="카운터 초기화 (분)" type="number" value={lockForm.lockout_reset_after} onChange={e => setLockForm(f => ({ ...f, lockout_reset_after: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button kind="ghost" onClick={() => setEditLock(false)}>취소</Button>
              <Button kind="primary" renderIcon={Checkmark} onClick={saveLock} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Kerberos (read-only) */}
      <div style={{ background: 'var(--cds-layer-01)', padding: '20px', border: '1px solid var(--cds-border-subtle-00)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} /> Kerberos 인증
        </h4>
        <Row label="Realm" value={(window as any).PolyON_DOMAIN?.realm || 'EXAMPLE.COM'} />
        <Row label="최대 티켓 수명" value="10시간" />
        <Row label="최대 갱신 기간" value="7일" />
      </div>
    </div>
  );
}
