import { useState, useEffect } from 'react';
import {
  ProgressIndicator,
  ProgressStep,
  TextInput,
  PasswordInput,
  Select,
  SelectItem,
  Toggle,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { CheckmarkFilled } from '@carbon/icons-react';

interface SetupData {
  realm: string;
  domain: string;
  org_name: string;
  function_level: string;
  service_base_domain: string;
  console_domain: string;
  mail_domain: string;
  portal_domain: string;
  external_access: 'internal' | 'external';
  polyon_admin_password: string;
  polyon_admin_password_confirm: string;
  dc_admin_password: string;
  dc_admin_password_confirm: string;
  dns_forwarder: string;
  enable_mail: boolean;
  mail_hostname: string;
  mail_server_ip: string;
}

const INIT: SetupData = {
  realm: '', domain: '', org_name: '', function_level: '2008_R2',
  service_base_domain: '', console_domain: '', mail_domain: '', portal_domain: '',
  external_access: 'internal',
  polyon_admin_password: '', polyon_admin_password_confirm: '',
  dc_admin_password: '', dc_admin_password_confirm: '',
  dns_forwarder: '8.8.8.8',
  enable_mail: true, mail_hostname: '', mail_server_ip: '',
};

const FUNCTION_LEVELS = ['2003', '2008', '2008_R2', '2012', '2012_R2'];

const STEP_LABELS = ['도메인', '서비스 도메인', 'PolyON 관리자', 'DC 관리자', '네트워크', '메일', '확인'];

interface Credential { id: string; name: string; username: string; password: string; port?: number }

// ── Password strength ─────────────────────────────────────────────────────────
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  const checks = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)];
  const score = pw.length >= 8 ? checks.filter(Boolean).length : Math.min(checks.filter(Boolean).length, 1);
  const labels = ['', '약함', '보통', '강함', '매우 강함'];
  const colors = ['', '#da1e28', '#f1c21b', '#24a148', '#0f62fe'];
  return { score, label: labels[score], color: colors[score] };
}

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = passwordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, height: 4, background: 'var(--cds-border-subtle)', overflow: 'hidden' }}>
        <div style={{ width: `${(score / 4) * 100}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color, minWidth: 60, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validatePassword(pw: string, confirm: string): string {
  if (pw.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다';
  const checks = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)];
  if (checks.filter(Boolean).length < 3) return '대소문자, 숫자, 특수문자 중 3가지 이상 포함해야 합니다';
  if (pw !== confirm) return '비밀번호가 일치하지 않습니다';
  return '';
}

// ── Main Setup Page ───────────────────────────────────────────────────────────
export default function SetupPage() {
  const [step, setStep] = useState(0); // 0 = welcome
  const [data, setData] = useState<SetupData>(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [revealedCreds, setRevealedCreds] = useState<Set<string>>(new Set());
  const [provisioning, setProvisioning] = useState(false);
  const [progress, setProgress] = useState<{ value: number; step: string } | null>(null);
  const [complete, setComplete] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Auto-derive from realm
  useEffect(() => {
    if (data.realm && !data.domain) {
      const nb = data.realm.split('.')[0].toUpperCase().slice(0, 15);
      setData(d => ({ ...d, domain: nb }));
    }
  }, [data.realm]);

  // Derive service domains when service_base_domain changes
  useEffect(() => {
    const sbd = data.service_base_domain || data.realm.toLowerCase();
    if (sbd) {
      setData(d => ({
        ...d,
        console_domain: d.console_domain || 'console.' + sbd,
        mail_domain: d.mail_domain || 'mail.' + sbd,
        portal_domain: d.portal_domain || 'portal.' + sbd,
        mail_hostname: d.mail_hostname || 'mail.' + sbd,
      }));
    }
  }, [data.service_base_domain]);

  function setF(field: keyof SetupData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setData(d => ({ ...d, [field]: e.target.value }));
      setErrors(er => { const n = { ...er }; delete n[field]; return n; });
    };
  }

  function err(field: string) {
    return errors[field] ? { invalid: true as const, invalidText: errors[field] } : {};
  }

  // ── Step 0: Welcome ──────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, background: 'var(--cds-interactive)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckmarkFilled size={32} style={{ color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>PolyON 초기 설정</h1>
        <p style={{ fontSize: '1rem', color: 'var(--cds-text-secondary)', margin: 0, textAlign: 'center', maxWidth: 480 }}>
          Active Directory 도메인 컨트롤러를 설정합니다.<br />
          도메인, 관리자 계정, 네트워크 설정을 단계별로 진행합니다.
        </p>
        <Button kind="primary" size="lg" onClick={() => setStep(1)}>시작하기</Button>
      </div>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (complete) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <CheckmarkFilled size={64} style={{ color: '#24a148' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>설정 완료!</h1>
          <p style={{ color: 'var(--cds-text-secondary)', margin: 0, textAlign: 'center' }}>
            {data.realm} 도메인이 성공적으로 프로비저닝되었습니다.
          </p>
        </div>
        {credentials.length > 0 && (
          <Tile style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>생성된 인증 정보</h4>
            {credentials.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--cds-border-subtle)' }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.name}</span>
                  {c.port && <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>:{c.port}</code>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>{c.username}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}>
                    {revealedCreds.has(c.id) ? c.password : '••••••••••••'}
                  </code>
                  <Button
                    kind="ghost"
                    onClick={() => setRevealedCreds(prev => {
                      const n = new Set(prev);
                      n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                      return n;
                    })}
                  >
                    {revealedCreds.has(c.id) ? '숨기기' : '표시'}
                  </Button>
                </div>
              </div>
            ))}
          </Tile>
        )}
        <Button kind="primary" onClick={() => { window.location.reload(); }}>대시보드로 이동</Button>
      </div>
    );
  }

  // ── Provisioning ─────────────────────────────────────────────────────────────
  if (provisioning && progress) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'center' }}>서비스 구성 진행 중</h2>
        <div style={{ margin: '0.5rem 0 1rem', height: 6, background: 'var(--cds-border-subtle)', overflow: 'hidden' }}>
          <div style={{ width: `${progress.value}%`, height: '100%', background: 'var(--cds-interactive)', transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', textAlign: 'center' }}>{progress.step}</p>
      </div>
    );
  }

  // ── Steps ─────────────────────────────────────────────────────────────────────
  // Progress indicator (steps 1-7)
  const progressUI = (
    <div style={{ marginBottom: '2rem', overflowX: 'auto' }}>
      <ProgressIndicator currentIndex={step - 1} spaceEqually>
        {STEP_LABELS.map((label, i) => (
          <ProgressStep key={i} label={label} />
        ))}
      </ProgressIndicator>
    </div>
  );

  // Navigation buttons
  function navButtons(onNext: () => void, onBack?: () => void) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
        <Button kind="secondary" onClick={onBack || (() => setStep(s => s - 1))}>이전</Button>
        <Button kind="primary" onClick={onNext}>다음</Button>
      </div>
    );
  }

  // ── Step 1: Domain ───────────────────────────────────────────────────────────
  if (step === 1) {
    function nextStep() {
      const errs: Record<string, string> = {};
      const fqdn = /^[A-Z0-9]([A-Z0-9-]*[A-Z0-9])?(\.[A-Z0-9]([A-Z0-9-]*[A-Z0-9])?)+$/;
      if (!fqdn.test(data.realm.toUpperCase()))
        errs.realm = '유효한 FQDN을 입력하세요 (예: EXAMPLE.COM)';
      const nb = data.domain.toUpperCase();
      if (!nb || nb.length > 15 || !/^[A-Z0-9][A-Z0-9-]*$/.test(nb))
        errs.domain = 'NetBIOS 이름은 1~15자 영숫자입니다';
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setData(d => ({ ...d, realm: d.realm.toUpperCase(), domain: d.domain.toUpperCase(), service_base_domain: d.service_base_domain || d.realm.toLowerCase() }));
      setStep(2);
    }
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>도메인 설정</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          Active Directory 도메인의 Realm과 NetBIOS 이름을 설정합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="realm" labelText="Realm (FQDN)" placeholder="example.com"
           
            value={data.realm} onChange={e => {
              const r = e.target.value;
              setData(d => ({ ...d, realm: r, domain: r && !errors.domain ? r.split('.')[0].toUpperCase().slice(0, 15) : d.domain }));
              setErrors(er => { const n = { ...er }; delete n.realm; return n; });
            }}
            {...err('realm')}
          />
          <TextInput
            id="domain" labelText="NetBIOS Name" placeholder="EXAMPLE" maxLength={15}
           
            value={data.domain} onChange={setF('domain')} {...err('domain')}
          />
          <TextInput
            id="org" labelText="조직 이름 (선택)" placeholder="Example Corp"
            value={data.org_name} onChange={setF('org_name')}
          />
          <Select
            id="level" labelText="Domain Function Level"
            value={data.function_level} onChange={setF('function_level')}
           
          >
            {FUNCTION_LEVELS.map(lv => (
              <SelectItem key={lv} value={lv} text={lv.replace('_', ' ')} />
            ))}
          </Select>
        </div>
        {navButtons(nextStep, () => setStep(0))}
      </div>
    );
  }

  // ── Step 2: Service Domain ───────────────────────────────────────────────────
  if (step === 2) {
    function nextStep() {
      const fqdn = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
      if (!fqdn.test(data.service_base_domain)) {
        setErrors({ service_base_domain: '유효한 도메인을 입력하세요 (예: example.com)' });
        return;
      }
      setStep(3);
    }
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>서비스 도메인 설정</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          PolyON 서비스에 사용할 도메인을 설정합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput
            id="sbd" labelText="서비스 기본 도메인" placeholder="example.com"
           
            value={data.service_base_domain} onChange={e => {
              const v = e.target.value.toLowerCase();
              setData(d => ({ ...d, service_base_domain: v, console_domain: 'console.' + v, mail_domain: 'mail.' + v, portal_domain: 'portal.' + v }));
              setErrors(er => { const n = { ...er }; delete n.service_base_domain; return n; });
            }}
            {...err('service_base_domain')}
          />
          <div style={{ background: 'var(--cds-layer-01)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>자동 설정 도메인 (개별 편집 가능)</p>
            <TextInput id="consoleDomain" labelText="Console" placeholder="console.example.com" value={data.console_domain} onChange={setF('console_domain')} />
            <TextInput id="mailDomain" labelText="Mail" placeholder="mail.example.com" value={data.mail_domain} onChange={setF('mail_domain')} />
            <TextInput id="portalDomain" labelText="Portal" placeholder="portal.example.com" value={data.portal_domain} onChange={setF('portal_domain')} />
          </div>
          <Toggle
            id="externalAccess"
            labelText="외부 공개 (인터넷에서 접근 허용)"
            labelA="내부 전용"
            labelB="외부 공개"
           
            toggled={data.external_access === 'external'}
            onToggle={v => setData(d => ({ ...d, external_access: v ? 'external' : 'internal' }))}
          />
        </div>
        {navButtons(nextStep)}
      </div>
    );
  }

  // ── Step 3: PolyON Admin Password ────────────────────────────────────────────
  if (step === 3) {
    function nextStep() {
      const msg = validatePassword(data.polyon_admin_password, data.polyon_admin_password_confirm);
      if (msg) { setErrors({ polyon_admin_password: msg }); return; }
      setStep(4);
    }
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>PolyON 관리자 비밀번호</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          PolyON Console 로그인에 사용되는 관리자 비밀번호를 설정합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput id="adminUser" labelText="사용자명" value="admin" readOnly />
          <div>
            <PasswordInput
              id="polyonPass" labelText="비밀번호" placeholder="비밀번호 입력"
              value={data.polyon_admin_password}
              onChange={e => { setData(d => ({ ...d, polyon_admin_password: e.target.value })); setErrors(er => { const n = { ...er }; delete n.polyon_admin_password; return n; }); }}
              {...(errors.polyon_admin_password ? { invalid: true, invalidText: errors.polyon_admin_password } : {})}
              autoComplete="new-password"
            />
            <PasswordStrength password={data.polyon_admin_password} />
          </div>
          <PasswordInput
            id="polyonPassConfirm" labelText="비밀번호 확인" placeholder="비밀번호 재입력"
            value={data.polyon_admin_password_confirm}
            onChange={setF('polyon_admin_password_confirm')}
            autoComplete="new-password"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', margin: 0 }}>최소 8자, 대소문자 + 숫자 + 특수문자 중 3가지 이상 포함</p>
        </div>
        {navButtons(nextStep)}
      </div>
    );
  }

  // ── Step 4: DC Admin Password ────────────────────────────────────────────────
  if (step === 4) {
    function nextStep() {
      const msg = validatePassword(data.dc_admin_password, data.dc_admin_password_confirm);
      if (msg) { setErrors({ dc_admin_password: msg }); return; }
      setStep(5);
    }
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>DC Administrator 비밀번호</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          Active Directory 도메인 컨트롤러의 Administrator 비밀번호를 설정합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput id="dcUser" labelText="사용자명" value="Administrator" readOnly />
          <div>
            <PasswordInput
              id="dcPass" labelText="비밀번호" placeholder="비밀번호 입력"
              value={data.dc_admin_password}
              onChange={e => { setData(d => ({ ...d, dc_admin_password: e.target.value })); setErrors(er => { const n = { ...er }; delete n.dc_admin_password; return n; }); }}
              {...(errors.dc_admin_password ? { invalid: true, invalidText: errors.dc_admin_password } : {})}
              autoComplete="new-password"
            />
            <PasswordStrength password={data.dc_admin_password} />
          </div>
          <PasswordInput
            id="dcPassConfirm" labelText="비밀번호 확인" placeholder="비밀번호 재입력"
            value={data.dc_admin_password_confirm}
            onChange={setF('dc_admin_password_confirm')}
            autoComplete="new-password"
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', margin: 0 }}>최소 8자, 대소문자 + 숫자 + 특수문자 중 3가지 이상 포함</p>
        </div>
        {navButtons(nextStep)}
      </div>
    );
  }

  // ── Step 5: Network ──────────────────────────────────────────────────────────
  if (step === 5) {
    function nextStep() {
      const parts = data.dns_forwarder.split('.');
      if (parts.length !== 4 || parts.some(p => isNaN(Number(p)) || +p < 0 || +p > 255)) {
        setErrors({ dns_forwarder: '유효한 IPv4 주소를 입력하세요' });
        return;
      }
      setStep(6);
    }
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>네트워크 설정</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>DNS 포워더를 설정합니다.</p>
        <TextInput
          id="dns" labelText="DNS Forwarder" placeholder="8.8.8.8"
         
          value={data.dns_forwarder} onChange={setF('dns_forwarder')}
          {...err('dns_forwarder')}
        />
        {navButtons(nextStep)}
      </div>
    );
  }

  // ── Step 6: Mail ─────────────────────────────────────────────────────────────
  if (step === 6) {
    const defaultHost = data.mail_hostname || ('mail.' + (data.realm || '').toLowerCase());
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>메일 서비스 구성</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          메일 서버를 함께 구성하면 DNS 레코드(MX, SPF, DKIM, DMARC 등)와 메일 도메인이 자동으로 설정됩니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Toggle
            id="enableMail"
            labelText="메일 서버 구성"
            labelA="비활성화"
            labelB="활성화"
           
            toggled={data.enable_mail}
            onToggle={v => setData(d => ({ ...d, enable_mail: v }))}
          />
          {data.enable_mail && (
            <>
              <TextInput
                id="mailHost" labelText="메일 호스트명" placeholder={defaultHost}
               
                value={data.mail_hostname} onChange={setF('mail_hostname')}
              />
              <TextInput
                id="mailIP" labelText="메일 서버 IP (선택)" placeholder="공인 IP (예: 203.0.113.10)"
               
                value={data.mail_server_ip} onChange={setF('mail_server_ip')}
              />
              <div style={{ background: 'var(--cds-layer-01)', padding: '1rem' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cds-text-secondary)' }}>자동 생성되는 DNS 레코드:</p>
                {['MX — 수신 메일 서버 지정', 'SPF — 발신 서버 인증', 'DKIM — 메일 서명 (Ed25519 + RSA)', 'DMARC — 인증 정책 (quarantine)', 'SRV — 클라이언트 자동 설정 (IMAP/SMTP)', 'CNAME — autoconfig / autodiscover', 'MTA-STS — TLS 강제 전송'].map(r => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.25rem 0' }}>
                    <code style={{ background: 'var(--cds-layer)', padding: '0 0.5rem', fontSize: '0.75rem' }}>{r.split(' — ')[0]}</code>
                    <span style={{ color: 'var(--cds-text-secondary)' }}>{r.split(' — ')[1]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {navButtons(() => setStep(7))}
      </div>
    );
  }

  // ── Step 7: Confirm ──────────────────────────────────────────────────────────
  if (step === 7) {
    const summaryRows: [string, string][] = [
      ['Realm', data.realm],
      ['NetBIOS Name', data.domain],
      ...(data.org_name ? [['조직', data.org_name] as [string, string]] : []),
      ['Function Level', data.function_level.replace('_', ' ')],
      ['서비스 기본 도메인', data.service_base_domain],
      ['Console 도메인', data.console_domain],
      ['Mail 도메인', data.mail_domain],
      ['Portal 도메인', data.portal_domain],
      ['DNS Forwarder', data.dns_forwarder],
      ['PolyON 관리자', `admin / ${'●'.repeat(data.polyon_admin_password.length)}`],
      ['DC Administrator', `Administrator / ${'●'.repeat(data.dc_admin_password.length)}`],
      ['메일 서버', data.enable_mail ? (data.mail_hostname || 'mail.' + data.realm.toLowerCase()) : '구성 안 함'],
    ];

    async function prepare() {
      try {
        const res = await fetch('/api/sentinel/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ realm: data.realm }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          setGlobalError((e as { detail?: string }).detail || 'Credential generation failed');
          return null;
        }
        const result = await res.json() as { success: boolean; credentials?: Credential[] };
        if (result.credentials) setCredentials(result.credentials);
        return result;
      } catch (e) {
        setGlobalError((e as Error).message);
        return null;
      }
    }

    async function startProvisioning() {
      setGlobalError('');
      const prepared = await prepare();
      if (!prepared) return;

      setProvisioning(true);
      setProgress({ value: 5, step: '서비스 시작 준비 중...' });

      try {
        const res = await fetch('/api/sentinel/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            realm: data.realm,
            domain: data.domain,
            polyon_admin_password: data.polyon_admin_password,
            dc_admin_password: data.dc_admin_password,
            dns_forwarder: data.dns_forwarder,
            org_name: data.org_name,
            function_level: data.function_level,
            enable_mail: data.enable_mail,
            mail_hostname: data.mail_hostname || `mail.${data.realm.toLowerCase()}`,
            mail_server_ip: data.mail_server_ip || '',
            service_base_domain: data.service_base_domain || data.realm.toLowerCase(),
            console_domain: data.console_domain,
            mail_domain: data.mail_domain,
            portal_domain: data.portal_domain,
            external_access: data.external_access,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})  as Promise<{ detail?: string }>).then(d => d.detail || 'Setup failed')));
        pollProvision();
      } catch {
        // API may die during full reset — poll for return
        pollProvision();
      }
    }

    function pollProvision() {
      const timer = setInterval(async () => {
        try {
          const res = await fetch('/api/sentinel/progress');
          const d = await res.json() as { progress?: number; step?: string; phase?: string; containers?: unknown[] };
          setProgress({ value: d.progress || 0, step: d.step || '' });
          if (d.phase === 'complete') {
            clearInterval(timer);
            setProgress({ value: 100, step: '모든 서비스가 준비되었습니다' });
            setTimeout(() => setComplete(true), 2000);
          } else if (d.phase === 'error') {
            clearInterval(timer);
            setProvisioning(false);
            setProgress(null);
            setGlobalError('설정 중 오류가 발생했습니다.');
          }
        } catch { /**/ }
      }, 2000);
    }

    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        {progressUI}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>설정 확인</h2>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '1.5rem' }}>
          아래 설정으로 도메인을 프로비저닝합니다.
        </p>

        <Tile style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
            {summaryRows.map(([k, v]) => (
              <>
                <span key={`k-${k}`} style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>{k}</span>
                <span key={`v-${k}`}><code>{v}</code></span>
              </>
            ))}
          </div>
        </Tile>

        {globalError && (
          <InlineNotification kind="error" title="오류" subtitle={globalError} style={{ marginBottom: '1rem' }} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <Button kind="secondary" onClick={() => setStep(6)}>이전</Button>
          <Button kind="primary" onClick={startProvisioning}>설정 시작</Button>
        </div>
      </div>
    );
  }

  return null;
}
