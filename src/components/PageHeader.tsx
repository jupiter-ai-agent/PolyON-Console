// @ts-nocheck
/**
 * PageHeader — IBM Cloud 스타일 히어로 배너
 * 다크 배경 + 타이틀 + 설명 + 액션 버튼
 */
import type { ReactNode, ComponentType } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** 선택적 아이콘 (Carbon icon component) */
  icon?: ComponentType<{ size?: number }>;
  /** 히어로 스타일 (다크 배너) 사용 여부. 기본: false */
  hero?: boolean;
  /** hero일 때 그라디언트 시작 색상 */
  heroColor?: string;
  /** 탭 등 추가 영역 */
  tabs?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  hero = false,
  heroColor = '#161616',
  tabs,
}: PageHeaderProps) {
  if (hero) {
    return (
      <div className="he-page-hero">
        <div
          className="he-page-hero__banner"
          style={{
            background: `linear-gradient(135deg, ${heroColor} 0%, #393939 100%)`,
          }}
        >
          <div className="he-page-hero__content">
            <div className="he-page-hero__text">
              {Icon && (
                <div className="he-page-hero__icon">
                  <Icon size={28} />
                </div>
              )}
              <div>
                <h1 className="he-page-hero__title">{title}</h1>
                {description && (
                  <p className="he-page-hero__desc">{description}</p>
                )}
              </div>
            </div>
            {actions && <div className="he-page-hero__actions">{actions}</div>}
          </div>
        </div>
        {tabs && <div className="he-page-hero__tabs">{tabs}</div>}
      </div>
    );
  }

  // 기본 스타일 (기존 유지)
  return (
    <div className="he-page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {Icon && <Icon size={20} style={{ color: 'var(--cds-text-secondary)' }} />}
        <h1 className="he-page-header__title">{title}</h1>
      </div>
      {description && (
        <p className="he-page-header__description">{description}</p>
      )}
      {actions && <div className="he-page-header__actions">{actions}</div>}
      {tabs && <div style={{ marginTop: '1rem' }}>{tabs}</div>}
    </div>
  );
}
