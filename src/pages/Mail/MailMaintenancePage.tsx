import { useState } from 'react';
import {
  Button,
  Tile,
  Tag,
  InlineNotification,
} from '@carbon/react';
import {
  Renew,
  Email,
  Search,
  Locked,
  Globe,
  Checkmark,
  Close,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, type ReloadResult } from '../../api/mail';

// ── 액션 정의 ──────────────────────────────────────────────────────────────

interface ActionItem {
  title: string;
  desc: string;
  api: string;
  icon: React.ReactNode;
  color: string;
}

interface ActionGroup {
  group: string;
  items: ActionItem[];
}

const ACTION_GROUPS: ActionGroup[] = [
  {
    group: '일반',
    items: [
      { title: '설정 리로드', desc: '서버 설정을 핫 리로드합니다. 리스너/스토어 변경은 재시작이 필요합니다.', api: '/reload', icon: <Checkmark size={24} />, color: 'blue' },
      { title: '설정 검증', desc: '설정 오류 및 경고를 확인합니다.', api: '/reload?dry-run=true', icon: <Checkmark size={24} />, color: 'teal' },
      { title: 'Webadmin 업데이트', desc: 'GitHub에서 최신 Stalwart Webadmin을 다운로드합니다.', api: '/update/webadmin', icon: <Globe size={24} />, color: 'purple' },
    ],
  },
  {
    group: '스팸 필터',
    items: [
      { title: '스팸 학습', desc: '사용 가능한 데이터로 스팸 분류기를 학습시킵니다.', api: '/spam-filter/train/start', icon: <Email size={24} />, color: 'blue' },
      { title: '스팸 재학습', desc: '기존 모델을 삭제하고 처음부터 다시 학습합니다.', api: '/spam-filter/train/reset', icon: <Close size={24} />, color: 'red' },
      { title: '스팸 규칙 업데이트', desc: 'GitHub에서 최신 스팸 필터 규칙을 다운로드합니다.', api: '/update/spam-filter', icon: <Locked size={24} />, color: 'green' },
    ],
  },
  {
    group: '검색 색인',
    items: [
      { title: '이메일 재색인', desc: '전체 이메일 전문 검색 색인을 재구축합니다.', api: '/store/reindex/email', icon: <Search size={24} />, color: 'blue' },
      { title: '캘린더 재색인', desc: '캘린더 전문 검색 색인을 재구축합니다.', api: '/store/reindex/calendar', icon: <Search size={24} />, color: 'teal' },
      { title: '연락처 재색인', desc: '연락처 전문 검색 색인을 재구축합니다.', api: '/store/reindex/contacts', icon: <Search size={24} />, color: 'purple' },
      { title: '트레이싱 재색인', desc: '트레이싱 로그 검색 색인을 재구축합니다.', api: '/store/reindex/tracing', icon: <Search size={24} />, color: 'gray' },
    ],
  },
];

// ── 액션 카드 ──────────────────────────────────────────────────────────────

function ActionCard({ item, onResult }: { item: ActionItem; onResult: (data: ReloadResult) => void }) {
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const r = await mailApi.maintenanceAction(item.api);
      const data = r.data ?? {};
      const errors = data.errors ? Object.keys(data.errors).length : 0;
      const warnings = data.warnings ? Object.keys(data.warnings).length : 0;
      if (errors > 0 || warnings > 0) onResult(data);
    } catch { /* ignore */ }
    setRunning(false);
  };

  const colorMap: Record<string, string> = {
    blue: 'var(--cds-support-info)',
    teal: 'var(--cds-support-success)',
    purple: 'var(--cds-support-warning)',
    red: 'var(--cds-support-error)',
    green: 'var(--cds-support-success)',
    gray: 'var(--cds-text-secondary)',
  };

  return (
    <Tile style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ color: colorMap[item.color] ?? 'var(--cds-interactive)', flexShrink: 0 }}>
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.title}</h4>
        <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)' }}>{item.desc}</p>
      </div>
      <Button kind="ghost" size="sm" onClick={run} disabled={running}>
        {running ? '실행 중…' : '실행'}
      </Button>
    </Tile>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailMaintenancePage() {
  const [actionResult, setActionResult] = useState<ReloadResult | null>(null);

  return (
    <>
      <PageHeader title="유지보수" description="설정 리로드, 스팸 학습, 검색 색인 등 서버 관리 작업" />

      {actionResult && (
        <div style={{ marginBottom: 24 }}>
          {actionResult.errors && Object.keys(actionResult.errors).length > 0 && (
            <InlineNotification
              kind="error"
              title="오류"
              subtitle={Object.entries(actionResult.errors).map(([k, v]) => `${k}: ${v}`).join('; ')}
              onCloseButtonClick={() => setActionResult(null)}
            />
          )}
          {actionResult.warnings && Object.keys(actionResult.warnings).length > 0 && (
            <InlineNotification
              kind="warning"
              title="경고"
              subtitle={Object.entries(actionResult.warnings).map(([k, v]) => `${k}: ${v}`).join('; ')}
              onCloseButtonClick={() => setActionResult(null)}
            />
          )}
        </div>
      )}

      {ACTION_GROUPS.map((group) => (
        <div key={group.group} style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
            {group.group}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map((item) => (
              <ActionCard key={item.title} item={item} onResult={setActionResult} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
