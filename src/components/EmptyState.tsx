// @ts-nocheck
/**
 * EmptyState — 일관된 빈 상태 UI
 * IBM Cloud 스타일: 아이콘 + 제목 + 설명 + 액션
 */
import type { ReactNode, ComponentType } from 'react';
import { Button } from '@carbon/react';

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="he-empty-state">
      {Icon && (
        <div className="he-empty-state__icon">
          <Icon size={48} />
        </div>
      )}
      <h3 className="he-empty-state__title">{title}</h3>
      {description && <p className="he-empty-state__desc">{description}</p>}
      {actionLabel && onAction && (
        <Button kind="tertiary" size="sm" onClick={onAction} style={{ marginTop: '1rem' }}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
