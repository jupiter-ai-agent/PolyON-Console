import { apiFetch } from '../../api/client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Tag, InlineLoading, Button } from '@carbon/react';
import { Security as Shield, Key, Locked, Renew } from  '@carbon/icons-react';

export default function SecurityPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/security/password-policy')
      .then((data: any) => { setPolicy(data.policy || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>보안</h1>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>Active Directory 보안 정책 및 감사 로그</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { icon: Key, title: '패스워드 정책', items: policy ? [
            { label: '최소 길이', value: `${policy.min_length ?? '-'}자` },
            { label: '복잡성', value: policy.complexity === 'on' ? '활성' : '비활성' },
            { label: '최대 수명', value: `${policy.max_age_days ?? '-'}일` },
          ] : [] },
          { icon: Locked, title: '계정 잠금 정책', items: policy ? [
            { label: '잠금 임계값', value: `${policy.lockout_threshold ?? '-'}회` },
            { label: '잠금 기간', value: `${policy.lockout_duration ?? '-'}분` },
            { label: '카운터 초기화', value: `${policy.lockout_reset_after ?? '-'}분` },
          ] : [] },
          { icon: Shield, title: 'Kerberos 인증', items: [
            { label: 'Realm', value: (window as any).PolyON_DOMAIN?.realm || 'EXAMPLE.COM' },
            { label: '최대 티켓 수명', value: '10시간' },
            { label: '최대 갱신 기간', value: '7일' },
          ] },
        ].map(({ icon: Icon, title, items }, i) => (
          <div key={i} style={{ background: 'var(--cds-layer-01)', border: '1px solid var(--cds-border-subtle-00)', padding: '20px' }}>
            <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon size={20} /> {title}
            </h4>
            {loading && i < 2 ? (
              <InlineLoading description="로딩 중..." />
            ) : (
              <div>
                {items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--cds-border-subtle-00)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
