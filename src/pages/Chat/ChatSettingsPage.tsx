// @ts-nocheck
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
} from '@carbon/react';

const BASE = '/api/v1/engines/chat';

const SECTIONS = [
  { key: 'ServiceSettings', label: '서비스 설정' },
  { key: 'TeamSettings',    label: '팀 설정' },
  { key: 'EmailSettings',   label: '이메일 설정' },
  { key: 'LdapSettings',    label: 'LDAP 설정' },
  { key: 'LogSettings',     label: '로그 설정' },
];

function maskSensitive(key: string, val: string) {
  if (/password|secret|key|token/i.test(key) && val.length > 0 && val !== 'false' && val !== 'true') {
    return '••••••••';
  }
  return val;
}

export default function ChatSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${BASE}/config`)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(d => setConfig(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Mattermost 설정"
        description="서버 구성 정보"
      />

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>로딩 중...</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: '#da1e28' }}>오류: {error}</div>
      ) : !config ? (
        <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>설정 정보 없음</div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {SECTIONS.map(sec => {
            const data = config[sec.key];
            if (!data) return null;
            const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
            if (!entries.length) return null;
            return (
              <div key={sec.key} style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e0e0e0', background: '#f4f4f4' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{sec.label}</h4>
                </div>
                <StructuredListWrapper>
                  <StructuredListBody>
                    {entries.map(([k, v]) => {
                      const display = maskSensitive(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
                      return (
                        <StructuredListRow key={k}>
                          <StructuredListCell
                            noWrap
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.75rem',
                              color: 'var(--cds-text-secondary)',
                              width: '40%',
                            }}
                          >
                            {k}
                          </StructuredListCell>
                          <StructuredListCell
                            style={{
                              fontSize: '0.8125rem',
                              maxWidth: 400,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {display}
                          </StructuredListCell>
                        </StructuredListRow>
                      );
                    })}
                  </StructuredListBody>
                </StructuredListWrapper>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
