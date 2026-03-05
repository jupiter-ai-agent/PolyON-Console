// @ts-nocheck
/**
 * Dashboard — Identity Stat Cards (Row 1)
 * Users / Groups / OUs / Computers — Carbon ClickableTile 사용
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClickableTile, SkeletonText } from '@carbon/react';
import {
  User,
  UserMultiple,
  FolderOpen,
  BareMetalServer,
} from '@carbon/icons-react';
import { dashboardApi } from '../../../api/dashboard';

interface StatItem {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  route: string;
}

function StatCard({ label, value, sub, icon, route }: StatItem) {
  const navigate = useNavigate();
  return (
    <ClickableTile
      onClick={() => navigate(route)}
      style={{ minHeight: '96px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <p className="cds--label" style={{ marginBottom: 0 }}>{label}</p>
        <span style={{ color: 'var(--cds-icon-secondary)' }}>{icon}</span>
      </div>
      <p
        className="cds--productive-heading-04"
        style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.2, margin: '4px 0' }}
      >
        {value}
      </p>
      {sub && (
        <p className="cds--label" style={{ color: 'var(--cds-text-secondary)', marginTop: '4px' }}>
          {sub}
        </p>
      )}
    </ClickableTile>
  );
}

export function StatCards() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [users, groups, ous, computers] = await Promise.all([
          dashboardApi.listUsers().catch(() => ({ count: 0, users: [] })),
          dashboardApi.listGroups().catch(() => ({ count: 0 })),
          dashboardApi.listOUs().catch(() => ({ count: 0 })),
          dashboardApi.domainComputers().catch(() => ({ computers: [] })),
        ]);
        if (!mounted) return;
        const activeUsers = users.users ? users.users.filter(u => u.enabled).length : 0;
        const compCount = computers.computers ? computers.computers.length : 0;
        setData([
          {
            label: 'Users',
            value: users.count ?? '—',
            sub: `${activeUsers} active`,
            icon: <User size={20} />,
            route: '/users',
          },
          {
            label: 'Groups',
            value: groups.count ?? '—',
            icon: <UserMultiple size={20} />,
            route: '/groups',
          },
          {
            label: 'OUs',
            value: ous.count ?? '—',
            icon: <FolderOpen size={20} />,
            route: '/ous',
          },
          {
            label: 'Computers',
            value: compCount,
            icon: <BareMetalServer size={20} />,
            route: '/computers',
          },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1px',
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {['Users', 'Groups', 'OUs', 'Computers'].map(label => (
          <div
            key={label}
            style={{
              background: 'var(--cds-layer-01)',
              border: '1px solid var(--cds-border-subtle-00)',
              padding: '16px',
              minHeight: '96px',
            }}
          >
            <p className="cds--label" style={{ marginBottom: '8px' }}>{label}</p>
            <SkeletonText heading style={{ width: '60px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {data.map(item => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}
