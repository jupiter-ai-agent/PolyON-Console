// @ts-nocheck
import { useState, useEffect } from 'react';
import { Tile, Tag, InlineLoading, InlineNotification, Grid, Column } from '@carbon/react';
import { Security, UserMultiple, Application, GroupPresentation, Activity } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

interface RealmOverview {
  id: string;
  name: string;
  users: number;
  clients: number;
  groups: number;
  active_sessions: number;
  enabled: boolean;
}

export default function AuthOverviewPage() {
  const [realms, setRealms] = useState<RealmOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/auth/overview')
      .then(r => r.json())
      .then(data => {
        setRealms(data.realms || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Auth 개요</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          Keycloak SSO Realm 현황
        </p>
      </div>

      {loading && <InlineLoading description="데이터를 불러오는 중..." />}

      {error && (
        <InlineNotification
          kind="error"
          title="오류"
          subtitle={error}
          style={{ marginBottom: '16px' }}
        />
      )}

      {!loading && !error && (
        <Grid>
          {realms.map(realm => (
            <Column key={realm.id} sm={4} md={4} lg={6}>
              <Tile style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Security size={20} />
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{realm.name}</span>
                  </div>
                  <Tag type={realm.enabled ? 'green' : 'red'}>
                    {realm.enabled ? '활성' : '비활성'}
                  </Tag>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cds-text-secondary)', fontSize: '12px' }}>
                      <UserMultiple size={14} />
                      사용자
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 600 }}>{realm.users}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cds-text-secondary)', fontSize: '12px' }}>
                      <Application size={14} />
                      클라이언트
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 600 }}>{realm.clients}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cds-text-secondary)', fontSize: '12px' }}>
                      <GroupPresentation size={14} />
                      그룹
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 600 }}>{realm.groups}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cds-text-secondary)', fontSize: '12px' }}>
                      <Activity size={14} />
                      활성 세션
                    </div>
                    <span style={{ fontSize: '28px', fontWeight: 600 }}>{realm.active_sessions}</span>
                  </div>
                </div>
              </Tile>
            </Column>
          ))}
        </Grid>
      )}
    </div>
  );
}
