

type StatusType = 'healthy' | 'down' | 'unknown' | 'warning';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const STATUS_LABELS: Record<StatusType, string> = {
  healthy: 'Healthy',
  down: 'Down',
  unknown: 'Unknown',
  warning: 'Warning',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`he-status-badge he-status-badge--${status}`}>
      <span className="he-status-badge__dot" />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
