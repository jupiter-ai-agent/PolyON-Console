// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Tile,
  Button,
  TextInput,
  PasswordInput,
  Toggle,
  Select,
  SelectItem,
  InlineNotification,
  SkeletonText,
  Tag,
} from '@carbon/react';
import { Edit, Email } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi, type SmtpConfig } from '../../api/settings';

const SEC_LABELS: Record<string, string> = {
  starttls: 'STARTTLS',
  ssl: 'SSL/TLS',
  none: '사용 안함',
};

const SEC_PORTS: Record<string, number> = {
  starttls: 587,
  ssl: 465,
  none: 25,
};

export default function SettingsSmtpPage() {
  const [config, setConfig] = useState<SmtpConfig>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Edit form state
  const [form, setForm] = useState<SmtpConfig>({});

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await settingsApi.getSmtpConfig();
      const cfg = (data as { data?: SmtpConfig }).data || data as SmtpConfig;
      setConfig(cfg);
      setForm({ ...cfg });
    } catch { setConfig({}); }
    finally { setLoading(false); }
  }

  function startEdit() {
    setForm({ ...config });
    setEditing(true);
    setError('');
    setStatusMsg(null);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({ ...config });
    setError('');
  }

  async function save() {
    if (!form.host) { setError('SMTP 서버 주소를 입력하세요.'); return; }
    if (!form.from_address) { setError('발신 이메일 주소를 입력하세요.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await settingsApi.putSmtpConfig(form);
      if (res.success) {
        setConfig({ ...form });
        setEditing(false);
        setStatusMsg({ type: 'success', msg: 'SMTP 설정이 저장되었습니다.' });
      } else {
        setError(res.error || '저장 실패');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setStatusMsg({ type: 'info', msg: '연결 테스트 중…' });
    try {
      const res = await settingsApi.testSmtpConnection();
      setStatusMsg({ type: 'success', msg: res.message || 'SMTP 서버 연결 성공' });
    } catch (e) {
      setStatusMsg({ type: 'error', msg: '연결 실패: ' + (e as Error).message });
    }
  }

  async function testMail() {
    const to = window.prompt('테스트 메일을 받을 이메일 주소:');
    if (!to) return;
    setStatusMsg({ type: 'info', msg: '테스트 메일 발송 중…' });
    try {
      const res = await settingsApi.testSmtpMail(to);
      setStatusMsg({ type: 'success', msg: res.message || '메일 발송 성공' });
    } catch (e) {
      setStatusMsg({ type: 'error', msg: '발송 실패: ' + (e as Error).message });
    }
  }

  const configured = !!config.host;

  return (
    <>
      <PageHeader
        title="메일 발송 설정"
        description="알림 및 시스템 메일 발송을 위한 SMTP 서버 설정"
        actions={
          configured && !editing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button kind="ghost" size="sm" onClick={testConnection}>연결 테스트</Button>
              <Button kind="ghost" size="sm" onClick={testMail}>테스트 메일</Button>
              <Button kind="primary" size="sm" renderIcon={Edit} onClick={startEdit}>편집</Button>
            </div>
          ) : (!editing ? (
            <Button kind="primary" size="sm" renderIcon={Edit} onClick={startEdit}>SMTP 설정</Button>
          ) : undefined)
        }
      />

      {statusMsg && (
        <InlineNotification
          kind={statusMsg.type}
          title=""
          subtitle={statusMsg.msg}
          onCloseButtonClick={() => setStatusMsg(null)}
          style={{ margin: '1rem 0' }}
        />
      )}

      <div style={{ maxWidth: 640, marginTop: '1.5rem' }}>
        {loading ? (
          <Tile><SkeletonText paragraph lines={5} /></Tile>
        ) : !editing ? (
          !configured ? (
            <Tile>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '0.75rem' }}>
                <Email size={48} style={{ color: 'var(--cds-text-placeholder)' }} />
                <p style={{ fontWeight: 600, color: 'var(--cds-text-primary)', margin: 0 }}>SMTP 서버가 설정되지 않았습니다</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', margin: 0 }}>
                  메일 알림을 사용하려면 SMTP 서버 정보를 설정하세요.
                </p>
              </div>
            </Tile>
          ) : (
            <Tile>
              {/* Status bar */}
              <div style={{
                margin: '-1rem -1rem 1rem',
                padding: '0.75rem 1rem',
                background: config.enabled ? '#defbe6' : 'var(--cds-layer-02)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span style={{
                  width: 8, height: 8,
                  background: config.enabled ? '#198038' : '#a8a8a8',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: config.enabled ? '#0e6027' : 'var(--cds-text-secondary)' }}>
                  메일 발송 {config.enabled ? '활성' : '비활성'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>서버</span>
                <code>{config.host}:{config.port || 587}</code>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>보안</span>
                <Tag type="blue" size="sm">{SEC_LABELS[config.security || 'starttls']}</Tag>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>인증</span>
                <span>{config.username || <span style={{ color: 'var(--cds-text-helper)' }}>설정 안함</span>}</span>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>발신 주소</span>
                <code>{config.from_address}</code>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>발신자 이름</span>
                <span>{config.from_name || 'PolyON'}</span>
                <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>알림 수신</span>
                <span>{config.alert_to ? <code>{config.alert_to}</code> : <span style={{ color: 'var(--cds-text-helper)' }}>미설정 (발신 주소로 발송)</span>}</span>
              </div>
            </Tile>
          )
        ) : (
          /* Edit mode */
          <Tile>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Toggle
                id="smtpEnabled"
                labelText="메일 발송"
                labelA="비활성"
                labelB="활성"
                toggled={!!form.enabled}
                onToggle={v => setForm(f => ({ ...f, enabled: v }))}
              />

              <div>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>서버 연결</h5>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <TextInput
                    id="smtpHost"
                    labelText="서버 주소"
                    placeholder="smtp.example.com"
                    value={form.host || ''}
                    onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <TextInput
                    id="smtpPort"
                    labelText="포트"
                    value={String(form.port || 587)}
                    onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 587 }))}
                    style={{ width: 80 }}
                    type="number"
                  />
                  <Select
                    id="smtpSec"
                    labelText="보안"
                    value={form.security || 'starttls'}
                    onChange={e => {
                      const sec = e.target.value as 'starttls' | 'ssl' | 'none';
                      setForm(f => ({ ...f, security: sec, port: SEC_PORTS[sec] }));
                    }}
                    style={{ width: 140 }}
                  >
                    {Object.entries(SEC_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v} text={l} />
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>인증</h5>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <TextInput
                    id="smtpUser"
                    labelText="사용자명"
                    placeholder="user@example.com"
                    value={form.username || ''}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    style={{ flex: 1, minWidth: 200 }}
                    autoComplete="off"
                  />
                  <PasswordInput
                    id="smtpPw"
                    labelText="비밀번호"
                    value={form.password || ''}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ flex: 1, minWidth: 200 }}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>발신자</h5>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <TextInput
                    id="smtpFrom"
                    labelText="발신 이메일"
                    placeholder="noreply@example.com"
                    value={form.from_address || ''}
                    onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))}
                    style={{ flex: 1, minWidth: 200 }}
                    type="email"
                  />
                  <TextInput
                    id="smtpFromName"
                    labelText="발신자 이름"
                    value={form.from_name || 'PolyON'}
                    onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                </div>
              </div>

              <div>
                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase' }}>알림 수신</h5>
                <TextInput
                  id="smtpAlertTo"
                  labelText="알림 수신 이메일"
                  placeholder="admin@example.com"
                  value={form.alert_to || ''}
                  onChange={e => setForm(f => ({ ...f, alert_to: e.target.value }))}
                 
                  type="email"
                  style={{ maxWidth: 400 }}
                />
              </div>

              {error && <InlineNotification kind="error" title="" subtitle={error} />}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button kind="ghost" onClick={cancelEdit}>취소</Button>
                <Button kind="primary" onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
              </div>
            </div>
          </Tile>
        )}
      </div>
    </>
  );
}
