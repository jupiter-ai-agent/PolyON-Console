// @ts-nocheck
/**
 * Dashboard — Quick Actions (IBM Cloud "For you" 패턴)
 * 자주 사용하는 기능으로 빠르게 이동
 */
import { useNavigate } from 'react-router-dom';
import { ClickableTile } from '@carbon/react';
import {
  UserMultiple,
  Application,
  Email,
  Bot,
  ContainerSoftware,
  Security,
  Settings,
  ChartLine,
} from '@carbon/icons-react';

const ACTIONS = [
  { label: '사용자 추가', desc: '새 AD 사용자 생성', icon: UserMultiple, path: '/users', color: '#0f62fe' },
  { label: 'Applications', desc: '앱 카탈로그 관리', icon: Application, path: '/apps', color: '#161616' },
  { label: '메일 관리', desc: '메일 계정 및 도메인', icon: Email, path: '/mail', color: '#198038' },
  { label: 'AI Platform', desc: 'LLM 모델 및 에이전트', icon: Bot, path: '/ai', color: '#6929c4' },
  { label: '컨테이너', desc: 'Docker 상태 확인', icon: ContainerSoftware, path: '/containers', color: '#005d5d' },
  { label: '모니터링', desc: '알림 및 성능 분석', icon: ChartLine, path: '/monitoring', color: '#b28600' },
  { label: '보안 감사', desc: '감사 로그 확인', icon: Security, path: '/security', color: '#da1e28' },
  { label: '설정', desc: '시스템 구성 변경', icon: Settings, path: '/settings', color: '#525252' },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div>
      <h4 className="cds--productive-heading-02" style={{ marginBottom: '12px' }}>
        빠른 실행
      </h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px',
        background: 'var(--cds-border-subtle)',
      }}>
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <ClickableTile
              key={action.label}
              onClick={() => navigate(action.path)}
              className="he-quick-action"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  background: action.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} style={{ color: '#fff' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--cds-text-primary)' }}>
                    {action.label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', margin: '2px 0 0' }}>
                    {action.desc}
                  </p>
                </div>
              </div>
            </ClickableTile>
          );
        })}
      </div>
    </div>
  );
}
