// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  Tag,
  Button,
  InlineLoading,
  InlineNotification,
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

interface FederationProvider {
  id: string;
  name: string;
  providerId: string;
  enabled: boolean | string;
  config: {
    connectionUrl?: string;
    usersDn?: string;
    bindDn?: string;
    syncRegistrations?: string;
    fullSyncPeriod?: string;
  };
}

export default function AuthFederationPage() {
  const [providers, setProviders] = useState<FederationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const fetchFederation = () => {
    setLoading(true);
    setError(null);
    apiFetch('/auth/federation?realm=polyon')
      .then(data => {
        setProviders(data.providers || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => { fetchFederation(); }, []);

  const handleSync = () => {
    setSyncing(true);
    setSyncResult(null);
    apiFetch('/auth/federation/sync?realm=polyon', { method: 'POST' })
      .then(data => {
        setSyncing(false);
        const allOk = data.results?.every((r: any) => r.success);
        setSyncResult({
          kind: allOk ? 'success' : 'error',
          message: allOk
            ? `LDAP 동기화 완료 (${data.synced}개 provider)`
            : `일부 동기화 실패: ${JSON.stringify(data.results?.filter((r: any) => !r.success))}`,
        });
      })
      .catch(e => {
        setSyncing(false);
        setSyncResult({ kind: 'error', message: e.message });
      });
  };

  const isEnabled = (v: boolean | string | undefined) => {
    if (typeof v === 'boolean') return v;
    return v === 'true';
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>LDAP 연동</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            polyon Realm Federation Provider 현황
          </p>
        </div>
        <Button
          renderIcon={Renew}
          onClick={handleSync}
          disabled={syncing || loading}
          kind="primary"
          size="md"
        >
          {syncing ? 'LDAP 동기화 중...' : 'LDAP 동기화'}
        </Button>
      </div>

      {syncResult && (
        <InlineNotification
          kind={syncResult.kind}
          title={syncResult.kind === 'success' ? '동기화 완료' : '동기화 오류'}
          subtitle={syncResult.message}
          onCloseButtonClick={() => setSyncResult(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {loading && <InlineLoading description="로딩 중..." />}

      {error && (
        <InlineNotification kind="error" title="오류" subtitle={error} />
      )}

      {!loading && !error && providers.length === 0 && (
        <InlineNotification
          kind="info"
          title="Federation Provider 없음"
          subtitle="polyon Realm에 등록된 LDAP/AD federation provider가 없습니다."
        />
      )}

      {!loading && !error && providers.map(provider => (
        <div key={provider.id} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{provider.name}</h2>
            <Tag type="blue">{provider.providerId}</Tag>
            <Tag type={isEnabled(provider.enabled) ? 'green' : 'red'}>
              {isEnabled(provider.enabled) ? '활성' : '비활성'}
            </Tag>
          </div>

          <StructuredListWrapper>
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>항목</StructuredListCell>
                <StructuredListCell head>값</StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell>Connection URL</StructuredListCell>
                <StructuredListCell>{provider.config?.connectionUrl || '-'}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Users DN</StructuredListCell>
                <StructuredListCell>{provider.config?.usersDn || '-'}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Bind DN</StructuredListCell>
                <StructuredListCell>{provider.config?.bindDn || '-'}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>동기화 등록</StructuredListCell>
                <StructuredListCell>
                  <Tag type={provider.config?.syncRegistrations === 'true' ? 'green' : 'gray'}>
                    {provider.config?.syncRegistrations === 'true' ? '활성' : '비활성'}
                  </Tag>
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>전체 동기화 주기</StructuredListCell>
                <StructuredListCell>
                  {provider.config?.fullSyncPeriod
                    ? `${provider.config.fullSyncPeriod}초`
                    : '-'}
                </StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>
          </StructuredListWrapper>
        </div>
      ))}
    </div>
  );
}
