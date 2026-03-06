// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Tile,
  Button,
  TextInput,
  PasswordInput,
  InlineNotification,
  SkeletonText,
} from '@carbon/react';
import { Edit } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi } from '../../api/settings';

interface Profile {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface TokenInfo {
  iat?: string;
  exp?: string;
  realm?: string;
  client?: string;
}

function getTokenInfo(): TokenInfo {
  try {
    const kc = (window as Window & { Auth?: { keycloak?: { tokenParsed?: { iat?: number; exp?: number; azp?: string; iss?: string }; realm?: string } } }).Auth?.keycloak;
    const parsed = kc?.tokenParsed;
    if (!parsed) return {};
    return {
      iat: parsed.iat ? new Date(parsed.iat * 1000).toLocaleString('ko-KR') : '—',
      exp: parsed.exp ? new Date(parsed.exp * 1000).toLocaleString('ko-KR') : '—',
      realm: kc?.realm || (parsed.iss ? parsed.iss.split('/realms/')[1] : '—'),
      client: parsed.azp || '—',
    };
  } catch { return {}; }
}

export default function SettingsAccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile edit
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password edit
  const [pwEditMode, setPwEditMode] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const tokenInfo = getTokenInfo();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await settingsApi.getProfile();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setFirstName(data.profile.firstName || '');
        setLastName(data.profile.lastName || '');
        setEmail(data.profile.email || '');
      } else {
        setError(data.error || '프로필 로드 실패');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError('');
    try {
      const res = await settingsApi.putProfile({ email, first_name: firstName, last_name: lastName });
      if (res.success) {
        setProfile(prev => prev ? { ...prev, firstName, lastName, email } : prev);
        setProfileEditMode(false);
        setSuccess('프로필이 업데이트되었습니다.');
      } else {
        setError(res.error || '저장 실패');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPwError('');
    if (!curPw) { setPwError('현재 비밀번호를 입력하세요.'); return; }
    if (newPw.length < 8) { setPwError('새 비밀번호는 최소 8자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    setSavingPw(true);
    try {
      const res = await settingsApi.putPassword({ current_password: curPw, new_password: newPw });
      if (res.success) {
        setPwEditMode(false);
        setCurPw(''); setNewPw(''); setConfirmPw('');
        setSuccess('비밀번호가 변경되었습니다.');
      } else {
        setPwError(res.error || '변경 실패');
      }
    } catch (e) {
      setPwError((e as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHeader title="내 계정" description="PolyON 관리자 계정 설정" />

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} onCloseButtonClick={() => setError('')} style={{ marginBottom: '1rem' }} />
      )}
      {success && (
        <InlineNotification kind="success" title="완료" subtitle={success} onCloseButtonClick={() => setSuccess('')} style={{ marginBottom: '1rem' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 720, marginTop: '1.5rem' }}>
        {/* Profile */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>프로필 정보</h3>
            {!profileEditMode && !loading && (
              <Button kind="ghost" renderIcon={Edit} onClick={() => setProfileEditMode(true)}>
                편집
              </Button>
            )}
          </div>

          {loading ? (
            <SkeletonText paragraph lines={4} />
          ) : !profileEditMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>사용자명</span>
              <code>{profile?.username || 'admin'}</code>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>이름</span>
              <span>{profile?.firstName || <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>}</span>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>성</span>
              <span>{profile?.lastName || <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>}</span>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>이메일</span>
              <span>{profile?.email || <span style={{ color: 'var(--cds-text-placeholder)' }}>—</span>}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
                사용자명: <code>{profile?.username || 'admin'}</code>
                <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-placeholder)', marginLeft: '0.5rem' }}>읽기 전용</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <TextInput id="firstName" labelText="이름" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="이름" />
                <TextInput id="lastName" labelText="성" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="성" />
              </div>
              <TextInput id="email" labelText="이메일" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 주소" type="email" />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button kind="ghost" onClick={() => { setProfileEditMode(false); setFirstName(profile?.firstName || ''); setLastName(profile?.lastName || ''); setEmail(profile?.email || ''); }}>취소</Button>
                <Button kind="primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? '저장 중...' : '저장'}</Button>
              </div>
            </div>
          )}
        </Tile>

        {/* Password */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{pwEditMode ? '비밀번호 변경' : '비밀번호'}</h3>
            {!pwEditMode && (
              <Button kind="ghost" renderIcon={Edit} onClick={() => setPwEditMode(true)}>변경</Button>
            )}
          </div>

          {!pwEditMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem', alignItems: 'center', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>비밀번호</span>
              <span>••••••••</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
              <PasswordInput id="curPw" labelText="현재 비밀번호" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" />
              <PasswordInput id="newPw" labelText="새 비밀번호" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="최소 8자" autoComplete="new-password" />
              <PasswordInput id="confirmPw" labelText="비밀번호 확인" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="새 비밀번호 재입력" autoComplete="new-password" />
              {pwError && <InlineNotification kind="error" title="" subtitle={pwError} />}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button kind="ghost" onClick={() => { setPwEditMode(false); setCurPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); }}>취소</Button>
                <Button kind="primary" onClick={savePassword} disabled={savingPw}>{savingPw ? '변경 중...' : '변경'}</Button>
              </div>
            </div>
          )}
        </Tile>

        {/* Session */}
        <Tile>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600 }}>세션 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem', alignItems: 'center', fontSize: '0.8125rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>로그인 시간</span>
            <span>{tokenInfo.iat || '—'}</span>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>토큰 만료</span>
            <span>{tokenInfo.exp || '—'}</span>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>Realm</span>
            <code>{tokenInfo.realm || '—'}</code>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>Client</span>
            <code>{tokenInfo.client || '—'}</code>
          </div>
        </Tile>
      </div>
    </>
  );
}
