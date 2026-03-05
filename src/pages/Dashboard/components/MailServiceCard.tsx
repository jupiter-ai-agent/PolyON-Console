// @ts-nocheck
/**
 * Dashboard — Mail Service Card (Row 2 Right)
 * Carbon Tile + Tag 사용
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tile, Tag, Button, SkeletonText, InlineNotification } from '@carbon/react';
import { CheckmarkFilled, Close, Email, WarningAlt } from '@carbon/icons-react';
import { dashboardApi } from '../../../api/dashboard';

interface MailData {
  provisioned: boolean;
  domainCount: number;
  accountCount: number;
  queueCount: number;
  services: Record<string, boolean>;
  stalwartRunning: boolean;
  domain: string;
}

function SvcBadge({ name, port, ok }: { name: string; port: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
      <span style={{ color: ok ? 'var(--cds-support-success)' : 'var(--cds-support-error)' }}>
        {ok ? <CheckmarkFilled size={12} /> : <Close size={12} />}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '80px' }}>{name}</span>
      <span style={{ fontSize: '11px', color: 'var(--cds-text-secondary)' }}>{port}</span>
    </div>
  );
}

export function MailServiceCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MailData | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [status, usersData, domainRes, queueRes, svcCheck] =
          await Promise.all([
            dashboardApi.mailStatus().catch(() => ({})),
            dashboardApi.listUsers().catch(() => ({ users: [] })),
            dashboardApi.stalwartPrincipals({ types: 'domain', limit: 1 }),
            dashboardApi.stalwartQueue({ limit: 1 }),
            dashboardApi.mailServiceCheck().catch(() => ({})),
          ]);
        if (!mounted) return;

        const mailStatus = status as { provisioned?: boolean; domain?: string };
        const users = usersData.users || [];
        const accCount = users.filter(u => u.mail && u.mail.includes('@')).length;
        const domCount = domainRes.data?.total ?? 0;
        const qCount = queueRes.data?.total ?? 0;
        const services = (svcCheck as { services?: Record<string, boolean> }).services || {};

        setData({
          provisioned: mailStatus.provisioned ?? false,
          domainCount: domCount,
          accountCount: accCount,
          queueCount: qCount,
          services,
          stalwartRunning: mailStatus.provisioned ?? false,
          domain: mailStatus.domain || '—',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const cardHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <Email size={16} />
      <h4 className="cds--productive-heading-02">메일 서비스</h4>
    </div>
  );

  if (loading) {
    return (
      <Tile style={{ height: '100%' }}>
        {cardHeader}
        <SkeletonText paragraph lineCount={5} />
      </Tile>
    );
  }

  if (!data?.provisioned) {
    return (
      <Tile style={{ height: '100%' }}>
        {cardHeader}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            메일 서비스가 구성되지 않았습니다
          </p>
          <Button kind="primary" size="sm" onClick={() => navigate('/mail')}>
            메일 구성
          </Button>
        </div>
      </Tile>
    );
  }

  const svc = data.services;

  return (
    <Tile style={{ height: '100%' }}>
      {cardHeader}

      {/* 요약 수치 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div
          style={{ textAlign: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/mail/domains')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/mail/domains')}
        >
          <p className="cds--productive-heading-04" style={{ fontSize: '1.75rem', fontWeight: 600 }}>
            {data.domainCount}
          </p>
          <p className="cds--label" style={{ color: 'var(--cds-text-secondary)' }}>도메인</p>
        </div>
        <div
          style={{ textAlign: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/mail/accounts')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/mail/accounts')}
        >
          <p className="cds--productive-heading-04" style={{ fontSize: '1.75rem', fontWeight: 600 }}>
            {data.accountCount}
          </p>
          <p className="cds--label" style={{ color: 'var(--cds-text-secondary)' }}>계정</p>
        </div>
        <div
          style={{ textAlign: 'center', cursor: 'pointer' }}
          onClick={() => navigate('/mail/queue')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/mail/queue')}
        >
          <p
            className="cds--productive-heading-04"
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: data.queueCount > 0 ? 'var(--cds-support-warning)' : undefined,
            }}
          >
            {data.queueCount}
          </p>
          <p className="cds--label" style={{ color: 'var(--cds-text-secondary)' }}>큐 대기</p>
        </div>
      </div>

      {/* 서비스 상태 */}
      <div style={{ borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '12px', marginBottom: '12px' }}>
        <p className="cds--label" style={{ marginBottom: '8px', fontWeight: 600, letterSpacing: '0.32px' }}>
          서비스 상태
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <SvcBadge name="SMTP"       port=":25"       ok={svc.smtp       ?? true} />
          <SvcBadge name="Submission" port=":587"      ok={svc.submission ?? true} />
          <SvcBadge name="IMAP"       port=":993"      ok={svc.imap       ?? true} />
          <SvcBadge name="CalDAV"     port="/dav/cal"  ok={svc.caldav     ?? true} />
          <SvcBadge name="JMAP"       port=":443"      ok={svc.jmap       ?? true} />
          <SvcBadge name="CardDAV"    port="/dav/card" ok={svc.carddav    ?? true} />
          <SvcBadge name="Sieve"      port=":4190"     ok={svc.sieve      ?? true} />
        </div>
      </div>

      {/* Stalwart 상태 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Tag type="green" size="sm" renderIcon={CheckmarkFilled}>Stalwart 실행 중</Tag>
        <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>
          도메인: {data.domain}
        </span>
      </div>
    </Tile>
  );
}
