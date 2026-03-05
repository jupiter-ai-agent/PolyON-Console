// @ts-nocheck
/**
 * PolyON Console — Dashboard Page
 * IBM Cloud 스타일: Hero 배너 + Quick Actions + 위젯 그리드
 */
import { useCallback, useState } from 'react';
import { Button, FlexGrid, Row, Column } from '@carbon/react';
import { Renew, Dashboard } from '@carbon/icons-react';
import { useAppStore } from '../../store/useAppStore';
import { PageHeader } from '../../components/PageHeader';

import { QuickActions } from './components/QuickActions';
import { StatCards } from './components/StatCards';
import { DomainInfoCard } from './components/DomainInfoCard';
import { MailServiceCard } from './components/MailServiceCard';
import { SystemResourcesCard } from './components/SystemResourcesCard';
import { AlertsCard } from './components/AlertsCard';

export default function DashboardPage() {
  const domainInfo = useAppStore(s => s.domainInfo);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const description = domainInfo.realm
    ? `${domainInfo.realm} — 시스템 전체 현황`
    : 'PolyON 통합 인프라 플랫폼';

  return (
    <div style={{ margin: '-1.5rem -2rem 0' }}>
      {/* ── Hero 배너 ── */}
      <PageHeader
        title="Dashboard"
        description={description}
        icon={Dashboard}
        hero
        heroColor="#161616"
        actions={
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            iconDescription="새로고침"
            hasIconOnly
            onClick={handleRefresh}
            tooltipPosition="bottom"
            style={{ color: '#fff' }}
          />
        }
      />

      <div style={{ padding: '1.5rem 2rem 2rem' }}>
        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <QuickActions />
        </div>

        {/* ── Identity Stat Cards ── */}
        <div style={{ marginBottom: '1rem' }}>
          <StatCards key={`stats-${refreshKey}`} />
        </div>

        {/* ── Domain Info + Mail Service ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '1rem' }}>
          <DomainInfoCard key={`domain-${refreshKey}`} />
          <MailServiceCard key={`mail-${refreshKey}`} />
        </div>

        {/* ── System Resources ── */}
        <div style={{ marginBottom: '1rem' }}>
          <SystemResourcesCard key={`resources-${refreshKey}`} />
        </div>

        {/* ── Recent Alerts ── */}
        <div style={{ marginBottom: '2rem' }}>
          <AlertsCard key={`alerts-${refreshKey}`} />
        </div>
      </div>
    </div>
  );
}
