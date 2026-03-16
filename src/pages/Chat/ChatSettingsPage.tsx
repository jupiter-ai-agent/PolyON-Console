import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, InlineNotification, Tabs, TabList, Tab, TabPanels, TabPanel,
  StructuredListWrapper, StructuredListBody, StructuredListRow, StructuredListCell,
  DataTableSkeleton, SkeletonText, TextInput, Toggle,
  Tag, Modal
} from '@carbon/react';
import { Save, Renew, Edit, Undo } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

async function chatFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const { getToken } = await import('../../api/client');
  const token = getToken();
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface Config {
  [key: string]: Record<string, unknown> | unknown;
}

const TABS = [
  { key: 'ServiceSettings', label: '서비스 설정', description: '기본 서비스 구성' },
  { key: 'TeamSettings', label: '팀 설정', description: '팀 관련 정책 및 제한사항' },
  { key: 'EmailSettings', label: '이메일 설정', description: '이메일 알림 및 SMTP 구성' },
  { key: 'LdapSettings', label: 'LDAP 설정', description: 'LDAP 인증 구성' },
  { key: 'LogSettings', label: '로그 설정', description: '시스템 로그 구성' },
  { key: 'FileSettings', label: '파일 설정', description: '파일 업로드 및 저장소 구성' },
  { key: 'SqlSettings', label: '데이터베이스 설정', description: 'SQL 데이터베이스 구성' },
  { key: 'PrivacySettings', label: '개인정보 설정', description: '개인정보 및 보안 정책' },
  { key: 'RateLimitSettings', label: '속도 제한', description: 'API 속도 제한 구성' },
];

// 민감 필드 — 편집 불가, 마스킹
const SENSITIVE_PATTERNS = [
  'password', 'secret', 'key', 'token', 'salt', 'privatekey',
  'datasource', 'connectionstring', 'licensekey',
];

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some(p => lower.includes(p));
}

// 읽기 전용 필드 (시스템 자동 설정)
const READONLY_KEYS = new Set([
  'Version', 'BuildDate', 'BuildNumber', 'BuildHash', 'BuildEnterpriseReady',
  'TelemetryId', 'DiagnosticId', 'DiagnosticsEnabled',
]);

function isReadonly(key: string): boolean {
  return READONLY_KEYS.has(key) || isSensitive(key);
}

function formatConfigKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (isSensitive(key)) {
    const s = String(value);
    if (s.length > 0 && s !== 'false' && s !== 'true' && s !== '0' && s !== '') return '••••••••';
  }
  if (typeof value === 'boolean') return value ? '활성화' : '비활성화';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return '[객체]'; }
  }
  const s = String(value);
  return s.length > 120 ? s.substring(0, 117) + '...' : s;
}

interface EditableSectionProps {
  sectionKey: string;
  title: string;
  description?: string;
  data: Record<string, unknown>;
  editMode: boolean;
  changes: Record<string, unknown>;
  onFieldChange: (section: string, key: string, value: unknown) => void;
}

function EditableSection({ sectionKey, title, description, data, editMode, changes, onFieldChange }: EditableSectionProps) {
  const entries = Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined);

  if (entries.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
          {description && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>{description}</p>}
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--cds-text-secondary)', fontSize: '0.875rem' }}>
          설정 정보가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        {description && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>{description}</p>}
      </div>

      <StructuredListWrapper>
        <StructuredListBody>
          {entries.map(([key, originalValue]) => {
            const changeKey = `${sectionKey}.${key}`;
            const currentValue = changeKey in changes ? changes[changeKey] : originalValue;
            const isChanged = changeKey in changes;
            const readonly = isReadonly(key);
            const sensitive = isSensitive(key);
            const isObject = typeof originalValue === 'object' && !Array.isArray(originalValue) && originalValue !== null;

            return (
              <StructuredListRow key={key}>
                <StructuredListCell
                  noWrap
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: isChanged ? 'var(--cds-support-info)' : 'var(--cds-text-secondary)',
                    width: '35%',
                    verticalAlign: 'top',
                    paddingTop: '1rem',
                    fontWeight: isChanged ? 600 : 400,
                  }}
                >
                  {formatConfigKey(key)}
                  {isChanged && <Tag type="blue" size="sm" style={{ marginLeft: '0.5rem' }}>변경</Tag>}
                  {sensitive && <Tag type="red" size="sm" style={{ marginLeft: '0.25rem' }}>민감</Tag>}
                </StructuredListCell>
                <StructuredListCell style={{ verticalAlign: 'top', paddingTop: '0.75rem' }}>
                  {editMode && !readonly && !isObject ? (
                    <FieldEditor
                      fieldKey={key}
                      value={currentValue}
                      originalValue={originalValue}
                      onChange={(v) => onFieldChange(sectionKey, key, v)}
                    />
                  ) : (
                    <code style={{
                      background: '#f4f4f4',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontFamily: "'IBM Plex Mono', monospace",
                      display: 'inline-block',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}>
                      {displayValue(key, currentValue)}
                    </code>
                  )}
                </StructuredListCell>
              </StructuredListRow>
            );
          })}
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

function FieldEditor({ fieldKey, value, originalValue, onChange }: {
  fieldKey: string;
  value: unknown;
  originalValue: unknown;
  onChange: (v: unknown) => void;
}) {
  if (typeof originalValue === 'boolean') {
    return (
      <Toggle
        id={`toggle-${fieldKey}`}
        size="sm"
        toggled={Boolean(value)}
        onToggle={(checked: boolean) => onChange(checked)}
        labelA="비활성화"
        labelB="활성화"
        hideLabel
      />
    );
  }

  if (typeof originalValue === 'number') {
    return (
      <TextInput
        id={`num-${fieldKey}`}
        size="sm"
        type="number"
        value={String(value ?? 0)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const n = Number(e.target.value);
          onChange(isNaN(n) ? 0 : n);
        }}
        style={{ maxWidth: '200px' }}
        labelText=""
        hideLabel
      />
    );
  }

  // String (default)
  return (
    <TextInput
      id={`text-${fieldKey}`}
      size="sm"
      value={String(value ?? '')}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      style={{ maxWidth: '400px' }}
      labelText=""
      hideLabel
    />
  );
}

export default function ChatSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [originalConfig, setOriginalConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [changes, setChanges] = useState<Record<string, unknown>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    subtitle: string;
  } | null>(null);

  const changesCount = Object.keys(changes).length;

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatFetch<Config>('/config');
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data)));
      setChanges({});
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleFieldChange = (section: string, key: string, value: unknown) => {
    const changeKey = `${section}.${key}`;
    const original = originalConfig?.[section] as Record<string, unknown> | undefined;
    const originalValue = original?.[key];

    setChanges(prev => {
      const next = { ...prev };
      // 원래 값으로 돌아가면 변경 목록에서 제거
      if (value === originalValue) {
        delete next[changeKey];
      } else {
        next[changeKey] = value;
      }
      return next;
    });
  };

  const handleDiscard = () => {
    setChanges({});
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
    }
    setEditMode(false);
  };

  const handleSave = async () => {
    setConfirmSave(false);
    setSaveLoading(true);
    setNotification(null);

    try {
      // 변경사항을 config에 반영
      const updatedConfig = JSON.parse(JSON.stringify(originalConfig)) as Config;
      for (const [changeKey, value] of Object.entries(changes)) {
        const [section, key] = changeKey.split('.');
        if (updatedConfig[section] && typeof updatedConfig[section] === 'object') {
          (updatedConfig[section] as Record<string, unknown>)[key] = value;
        }
      }

      await chatFetch('/config', {
        method: 'PUT',
        body: JSON.stringify(updatedConfig),
      });

      setNotification({
        type: 'success',
        title: '설정 저장 완료',
        subtitle: `${changesCount}개 항목이 성공적으로 저장되었습니다.`,
      });

      // 새로고침하여 서버 상태 반영
      await loadConfig();
    } catch (err) {
      setNotification({
        type: 'error',
        title: '설정 저장 실패',
        subtitle: err instanceof Error ? err.message : '알 수 없는 오류',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const availableTabs = TABS.filter(tab => {
    const sectionData = config?.[tab.key];
    return sectionData && typeof sectionData === 'object' && Object.keys(sectionData as object).length > 0;
  });

  return (
    <>
      <PageHeader
        title="서버 설정"
        description="Mattermost 서버 구성 관리"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {editMode && changesCount > 0 && (
              <Tag type="blue">{changesCount}개 변경</Tag>
            )}
            <Button kind="ghost" renderIcon={Renew} onClick={loadConfig} disabled={loading || saveLoading}>
              새로고침
            </Button>
            {editMode ? (
              <>
                <Button kind="secondary" renderIcon={Undo} onClick={handleDiscard} disabled={saveLoading}>
                  취소
                </Button>
                <Button
                  kind="primary"
                  renderIcon={Save}
                  onClick={() => changesCount > 0 ? setConfirmSave(true) : setEditMode(false)}
                  disabled={saveLoading || changesCount === 0}
                >
                  {saveLoading ? '저장 중...' : '저장'}
                </Button>
              </>
            ) : (
              <Button kind="primary" renderIcon={Edit} onClick={() => setEditMode(true)} disabled={loading}>
                편집
              </Button>
            )}
          </div>
        }
      />

      {notification && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={notification.type}
            title={notification.title}
            subtitle={notification.subtitle}
            onCloseButtonClick={() => setNotification(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification kind="error" title="오류" subtitle={error} onCloseButtonClick={() => setError('')} />
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '1.5rem' }}>
          <SkeletonText heading />
          <div style={{ marginTop: '1rem' }}><DataTableSkeleton /></div>
        </div>
      ) : !config || availableTabs.length === 0 ? (
        <div style={{ marginTop: '1.5rem', padding: '3rem', textAlign: 'center', color: 'var(--cds-text-secondary)', background: '#fff', border: '1px solid #e0e0e0' }}>
          설정 정보를 불러올 수 없습니다.
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {editMode && (
            <div style={{ marginBottom: '1rem' }}>
              <InlineNotification
                kind="info"
                title="편집 모드"
                subtitle="민감 정보(비밀번호, 토큰 등)와 시스템 필드는 편집할 수 없습니다. 변경 후 '저장'을 누르면 Mattermost에 즉시 반영됩니다."
                hideCloseButton
                lowContrast
              />
            </div>
          )}

          <Tabs selectedIndex={selectedTab} onChange={(e: { selectedIndex: number }) => setSelectedTab(e.selectedIndex)}>
            <TabList>
              {availableTabs.map(tab => (
                <Tab key={tab.key}>{tab.label}</Tab>
              ))}
            </TabList>
            <TabPanels>
              {availableTabs.map(tab => (
                <TabPanel key={tab.key}>
                  <div style={{ marginTop: '1rem' }}>
                    <EditableSection
                      sectionKey={tab.key}
                      title={tab.label}
                      description={tab.description}
                      data={(config[tab.key] || {}) as Record<string, unknown>}
                      editMode={editMode}
                      changes={changes}
                      onFieldChange={handleFieldChange}
                    />
                  </div>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1.25rem',
            background: '#f4f4f4',
            border: '1px solid #e0e0e0',
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>설정 섹션: {availableTabs.length}개</span>
            <span>마지막 로드: {new Date().toLocaleString('ko-KR')}</span>
          </div>
        </div>
      )}

      {/* 저장 확인 모달 */}
      <Modal
        open={confirmSave}
        onRequestClose={() => setConfirmSave(false)}
        onRequestSubmit={handleSave}
        modalHeading="설정 저장"
        primaryButtonText="저장"
        secondaryButtonText="취소"
        danger={false}
      >
        <p style={{ marginBottom: '1rem' }}>
          <strong>{changesCount}개 항목</strong>을 변경합니다. Mattermost 서버에 즉시 반영됩니다.
        </p>
        <div style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
          {Object.entries(changes).map(([changeKey, value]) => {
            const [section, key] = changeKey.split('.');
            const original = originalConfig?.[section] as Record<string, unknown> | undefined;
            const originalValue = original?.[key];
            return (
              <div key={changeKey} style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                  {section} &gt; {formatConfigKey(key)}
                </span>
                <div style={{ marginTop: '0.25rem' }}>
                  <Tag type="red" size="sm">{displayValue(key, originalValue)}</Tag>
                  <span style={{ margin: '0 0.5rem' }}>&rarr;</span>
                  <Tag type="green" size="sm">{displayValue(key, value)}</Tag>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
