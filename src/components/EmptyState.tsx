import type { ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      color: 'var(--cds-text-secondary)',
    }}>
      {Icon && <Icon size={64} />}
      <h4 style={{ 
        marginTop: '1rem', 
        fontSize: '1.125rem', 
        fontWeight: 600, 
        color: 'var(--cds-text-primary)' 
      }}>{title}</h4>
      {description && (
        <p style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.875rem', 
          maxWidth: '400px', 
          textAlign: 'center' 
        }}>{description}</p>
      )}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}