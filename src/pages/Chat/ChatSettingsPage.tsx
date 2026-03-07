import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, InlineNotification, Tabs, TabList, Tab, TabPanels, TabPanel,
  StructuredListWrapper, StructuredListBody, StructuredListRow, StructuredListCell,
  DataTableSkeleton, SkeletonText
} from '@carbon/react';
import { Save, Renew } from '@carbon/icons-react';

const BASE = '/api/v1/engines/chat';

async function chatFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
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
  ServiceSettings?: Record<string, any>;
  TeamSettings?: Record<string, any>;
  EmailSettings?: Record<string, any>;
  LdapSettings?: Record<string, any>;
  LogSettings?: Record<string, any>;
  [key: string]: any;
}

const TABS = [
  { key: 'ServiceSettings', label: '서비스 설정', description: '기본 서비스 구성' },
  { key: 'TeamSettings', label: '팀 설정', description: '팀 관련 정책 및 제한사항' },
  { key: 'EmailSettings', label: '이메일 설정', description: '이메일 알림 및 SMTP 구성' },
  { key: 'LdapSettings', label: 'LDAP 설정', description: 'LDAP 인증 구성' },
  { key: 'LogSettings', label: '로그 설정', description: '시스템 로그 구성' },
];

function maskSensitiveValue(key: string, value: any): string {
  if (value === null || value === undefined) return '—';
  
  const str = String(value);
  const lowerKey = key.toLowerCase();
  
  // 민감한 정보 마스킹
  if (
    (lowerKey.includes('password') ||
     lowerKey.includes('secret') ||
     lowerKey.includes('key') ||
     lowerKey.includes('token')) &&
    str.length > 0 &&
    str !== 'false' &&
    str !== 'true' &&
    str !== '0' &&
    str !== ''
  ) {
    return '••••••••';
  }
  
  // Boolean 값 처리
  if (typeof value === 'boolean') {
    return value ? '활성화' : '비활성화';
  }
  
  // 긴 문자열 줄임
  if (typeof value === 'string' && str.length > 100) {
    return str.substring(0, 97) + '...';
  }
  
  // 객체나 배열은 JSON으로
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[복합 객체]';
    }
  }
  
  return str;
}

function formatConfigKey(key: string): string {
  // CamelCase를 사람이 읽기 쉬운 형태로 변환
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function ConfigSection({ title, data, description }: {
  title: string;
  data: Record<string, any>;
  description?: string;
}) {
  const entries = Object.entries(data || {}).filter(([, value]) => 
    value !== null && value !== undefined
  );
  
  if (entries.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderBottom: '1px solid #e0e0e0', 
          background: '#f4f4f4' 
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
          {description && (
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)' 
            }}>
              {description}
            </p>
          )}
        </div>
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: 'var(--cds-text-secondary)', 
          fontSize: '0.875rem' 
        }}>
          설정 정보가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginBottom: '1rem' }}>
      <div style={{ 
        padding: '1rem 1.25rem', 
        borderBottom: '1px solid #e0e0e0', 
        background: '#f4f4f4' 
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        {description && (
          <p style={{ 
            margin: '0.25rem 0 0 0', 
            fontSize: '0.875rem', 
            color: 'var(--cds-text-secondary)' 
          }}>
            {description}
          </p>
        )}
      </div>
      
      <StructuredListWrapper>
        <StructuredListBody>
          {entries.map(([key, value]) => (
            <StructuredListRow key={key}>
              <StructuredListCell
                noWrap
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.75rem',
                  color: 'var(--cds-text-secondary)',
                  width: '40%',
                  verticalAlign: 'top',
                  paddingTop: '1rem',
                }}
              >
                {formatConfigKey(key)}
              </StructuredListCell>
              <StructuredListCell
                style={{
                  fontSize: '0.8125rem',
                  verticalAlign: 'top',
                  paddingTop: '1rem',
                  wordBreak: 'break-word',
                }}
              >
                <code style={{ 
                  background: '#f4f4f4', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: 'var(--cds-text-primary)',
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {maskSensitiveValue(key, value)}
                </code>
              </StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}

export default function ChatSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState(0);

  // For future implementation (Phase D)
  const [saveLoading, setSaveLoading] = useState(false);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'warning'; 
    title: string; 
    subtitle: string 
  } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await chatFetch<Config>('/config');
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    // Phase D에서 구현 예정
    setNotification({
      type: 'warning',
      title: '기능 준비 중',
      subtitle: '설정 편집 기능은 Phase D에서 구현 예정입니다.'
    });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const availableTabs = TABS.filter(tab => {
    const sectionData = config?.[tab.key];
    return sectionData && Object.keys(sectionData).length > 0;
  });

  return (
    <>
      <PageHeader
        title="서버 설정"
        description="Mattermost 서버 구성 정보 (읽기 전용)"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              kind="ghost"
              renderIcon={Renew}
              onClick={loadConfig}
              disabled={loading}
            >
              새로고침
            </Button>
            <Button
              kind="primary"
              renderIcon={Save}
              onClick={handleSaveConfig}
              disabled={loading || saveLoading}
            >
              {saveLoading ? '저장 중...' : '설정 저장'}
            </Button>
          </div>
        }
      />

      {/* Notification */}
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
          <InlineNotification
            kind="error"
            title="설정 로딩 오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '1.5rem' }}>
          <SkeletonText heading />
          <div style={{ marginTop: '1rem' }}>
            <DataTableSkeleton />
          </div>
        </div>
      ) : !config ? (
        <div style={{ 
          marginTop: '1.5rem',
          padding: '3rem', 
          textAlign: 'center', 
          color: 'var(--cds-text-secondary)',
          background: '#fff',
          border: '1px solid #e0e0e0'
        }}>
          설정 정보를 불러올 수 없습니다.
        </div>
      ) : availableTabs.length === 0 ? (
        <div style={{ 
          marginTop: '1.5rem',
          padding: '3rem', 
          textAlign: 'center', 
          color: 'var(--cds-text-secondary)',
          background: '#fff',
          border: '1px solid #e0e0e0'
        }}>
          표시할 설정 정보가 없습니다.
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e0e0e0',
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: '4px'
          }}>
            <InlineNotification
              kind="info"
              title="현재는 읽기 전용"
              subtitle="설정 수정 기능은 Phase D에서 구현됩니다. 현재는 설정 조회만 가능합니다."
              hideCloseButton
              lowContrast
            />
          </div>

          <Tabs selectedIndex={selectedTab} onChange={(e) => setSelectedTab(e.selectedIndex)}>
            <TabList>
              {availableTabs.map((tab, index) => (
                <Tab key={tab.key}>{tab.label}</Tab>
              ))}
            </TabList>
            
            <TabPanels>
              {availableTabs.map((tab, index) => (
                <TabPanel key={tab.key}>
                  <div style={{ marginTop: '1rem' }}>
                    <ConfigSection
                      title={tab.label}
                      description={tab.description}
                      data={config[tab.key] || {}}
                    />
                  </div>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
          
          {/* 설정 요약 정보 */}
          <div style={{ 
            marginTop: '1rem',
            padding: '1rem 1.25rem', 
            background: '#f4f4f4',
            border: '1px solid #e0e0e0',
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              로드된 설정 섹션: {availableTabs.length}개
            </span>
            <span>
              마지막 업데이트: {new Date().toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
      )}
    </>
  );
}