// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import {
  Tile,
  Button,
  TextInput,
  InlineNotification,
  SkeletonText,
  Tag,
  Select,
  SelectItem,
  InlineLoading,
} from '@carbon/react';
import { Edit, Information } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { settingsApi, type DomainInfo, type DomainLevelData } from '../../api/settings';

interface DomainConfig {
  dc_domain?: string;
  mail_domain?: string;
  console_domain?: string;
  portal_domain?: string;
}

const LEVELS = ['2003', '2008', '2008_R2', '2012', '2012_R2'] as const;

export default function SettingsDomainPage() {
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [config, setConfig] = useState<DomainConfig>({});
  const [levelData, setLevelData] = useState<DomainLevelData>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [consoleDomain, setConsoleDomain] = useState('');
  const [portalDomain, setPortalDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [raisingLevel, setRaisingLevel] = useState(false);
  const [levelMsg, setLevelMsg] = useState('');

  const consoleDomainRef = useRef(consoleDomain);
  consoleDomainRef.current = consoleDomain;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [di, dc, ld] = await Promise.all([
        settingsApi.getDomainInfo().catch(() => ({})),
        settingsApi.getDomainConfig().catch(() => ({})),
        settingsApi.getDomainLevel().catch(() => ({})),
      ]);
      const info = (di as { data?: DomainInfo }).data || di as DomainInfo;
      setDomainInfo(info);
      setConfig(dc as DomainConfig);
      setLevelData(ld as DomainLevelData);
      setConsoleDomain((dc as DomainConfig).console_domain || '');
      setPortalDomain((dc as DomainConfig).portal_domain || '');

      // Set default next level
      const ld2 = ld as DomainLevelData;
      const cur = ld2.domain_level || '';
      const parsedKey = cur.match(/200[38]|2012/i)?.[0]?.replace(' ', '_') || '';
      const hasR2 = cur.includes('R2');
      const currentKey = parsedKey ? (parsedKey + (hasR2 ? '_R2' : '')) : '2008_R2';
      const currentIdx = LEVELS.indexOf(currentKey as typeof LEVELS[number]);
      if (currentIdx < LEVELS.length - 1) {
        setNewLevel(LEVELS[currentIdx + 1]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveDomains() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body: Partial<DomainConfig> = {};
      if (consoleDomain) body.console_domain = consoleDomain;
      if (portalDomain) body.portal_domain = portalDomain;
      const res = await settingsApi.putDomainConfig(body);
      if (res.success) {
        setConfig(prev => ({ ...prev, ...body }));
        setSuccess('도메인 설정이 저장되었습니다.');
        setEditMode(false);
      } else {
        setError(res.error || '저장 실패');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function raiseLevel() {
    if (!newLevel) return;
    if (!window.confirm(`Function Level을 ${newLevel.replace('_', ' ')}(으)로 올리시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setRaisingLevel(true);
    setLevelMsg('');
    try {
      const res = await settingsApi.raiseDomainLevel(newLevel, newLevel);
      if (res.success) {
        setLevelMsg('Function Level이 변경되었습니다.');
        loadAll();
      } else {
        setLevelMsg('변경 실패: ' + (res.error || res.output || 'Unknown error'));
      }
    } catch (e) {
      setLevelMsg('변경 실패: ' + (e as Error).message);
    } finally {
      setRaisingLevel(false);
    }
  }

  const c = config;
  const dcDomain = c.dc_domain || domainInfo?.domain || '';
  const mailDomain = c.mail_domain || (dcDomain ? 'mail.' + dcDomain : '');

  // Level logic
  const ld = levelData;
  const curDomainLevel = ld.domain_level || '';
  const parsedKey = curDomainLevel.match(/200[38]|2012/i)?.[0]?.replace(' ', '_') || '';
  const hasR2 = curDomainLevel.includes('R2');
  const currentKey = parsedKey ? (parsedKey + (hasR2 ? '_R2' : '')) : '2008_R2';
  const currentIdx = LEVELS.indexOf(currentKey as typeof LEVELS[number]);
  const canRaise = currentIdx < LEVELS.length - 1;

  return (
    <>
      <PageHeader
        title="도메인 설정"
        description="Active Directory 도메인 및 서비스 도메인 정보"
      />

      {error && (
        <InlineNotification
          kind="error"
          title="오류"
          subtitle={error}
          onCloseButtonClick={() => setError('')}
          style={{ marginBottom: '1rem' }}
        />
      )}
      {success && (
        <InlineNotification
          kind="success"
          title="완료"
          subtitle={success}
          onCloseButtonClick={() => setSuccess('')}
          style={{ marginBottom: '1rem' }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* AD Domain Info */}
        <Tile>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>AD 도메인 정보</h4>
          {loading ? (
            <SkeletonText paragraph lines={6} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
              {[
                ['Domain', domainInfo?.domain || domainInfo?.realm || '—'],
                ['NetBIOS Name', domainInfo?.netbios || '—'],
                ['Forest', domainInfo?.forest || domainInfo?.domain || '—'],
                ['Domain DN', domainInfo?.dn || '—'],
                ['DC Hostname', domainInfo?.hostname || '—'],
                ['FSMO Roles', domainInfo?.fsmo || 'All (single DC)'],
                ['Function Level', curDomainLevel || domainInfo?.level || '—'],
              ].map(([k, v]) => (
                <>
                  <span key={`k-${k}`} style={{ fontWeight: 500 }}>{k}</span>
                  <span key={`v-${k}`}>{v}</span>
                </>
              ))}
            </div>
          )}
        </Tile>

        {/* Function Level Raise */}
        <Tile>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Domain Function Level 변경</h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', margin: '0 0 1rem' }}>
            기능 레벨을 올리면 더 많은 AD 기능을 사용할 수 있습니다.
            <strong style={{ color: 'var(--cds-text-error)' }}> 한 번 올리면 내릴 수 없습니다.</strong>
          </p>
          {loading ? (
            <SkeletonText />
          ) : canRaise ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Select
                id="newLevel"
                labelText="새 레벨"
                value={newLevel}
                onChange={e => setNewLevel(e.target.value)}
                style={{ width: 200 }}
              >
                {LEVELS.map((lv, i) => (
                  <SelectItem
                    key={lv}
                    value={lv}
                    text={lv.replace('_', ' ') + (i === currentIdx ? ' (현재)' : '')}
                    disabled={i <= currentIdx}
                  />
                ))}
              </Select>
              <Button
                kind="danger"
                size="md"
                onClick={raiseLevel}
                disabled={raisingLevel || !newLevel}
                renderIcon={raisingLevel ? InlineLoading : undefined}
              >
                레벨 올리기
              </Button>
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)' }}>
              이미 최고 레벨(2012 R2)입니다.
            </p>
          )}
          {levelMsg && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: levelMsg.startsWith('변경 실패') ? 'var(--cds-support-error)' : 'var(--cds-support-success)' }}>
              {levelMsg}
            </p>
          )}
        </Tile>

        {/* Service Domains */}
        <Tile>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>서비스 도메인</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>PolyON 핵심 서비스 도메인 설정</p>
            </div>
            {!editMode && (
              <Button
                kind="ghost"
               
                renderIcon={Edit}
                onClick={() => setEditMode(true)}
              >
                편집
              </Button>
            )}
          </div>

          {/* Read-only fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>DC Domain</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code>{dcDomain || '미설정'}</code>
              <Tag type="gray">변경 불가</Tag>
            </span>
            <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>Mail Domain</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code>{mailDomain || '미설정'}</code>
              <Tag type="gray">변경 불가</Tag>
            </span>
          </div>

          {!editMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>Console Domain</span>
              <code>{c.console_domain || '미설정'}</code>
              <span style={{ fontWeight: 500, color: 'var(--cds-text-secondary)' }}>Portal Domain</span>
              <code>{c.portal_domain || '미설정'}</code>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TextInput
                id="consoleDomain"
                labelText="Console Domain"
               
                placeholder="console.example.com"
                value={consoleDomain}
                onChange={e => setConsoleDomain(e.target.value)}
              />
              <TextInput
                id="portalDomain"
                labelText="Portal Domain"
               
                placeholder="portal.example.com"
                value={portalDomain}
                onChange={e => setPortalDomain(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button kind="ghost" onClick={() => { setEditMode(false); setConsoleDomain(c.console_domain || ''); setPortalDomain(c.portal_domain || ''); }}>
                  취소
                </Button>
                <Button kind="primary" onClick={saveDomains} disabled={saving}>
                  {saving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </Tile>

        {/* Forest Level Info */}
        {!loading && ld.forest_level && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>
            <Information size={14} />
            <span>Forest Level: {ld.forest_level}</span>
          </div>
        )}
      </div>
    </>
  );
}
