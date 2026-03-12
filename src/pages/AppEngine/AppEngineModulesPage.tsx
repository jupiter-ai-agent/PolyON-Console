import { useEffect, useState, useMemo } from 'react';
import {
  Tag,
  Button,
  Select,
  SelectItem,
  InlineNotification,
  InlineLoading,
  Modal,
  Search,
} from '@carbon/react';
import { Renew, TrashCan, Add, Application } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

interface OdooModule {
  id: number;
  name: string;
  shortdesc: string;
  state: string;
  author: string;
  description: string;
  category_id: [number, string] | false | null;
  icon_data: string;
}

interface ModulesResponse {
  modules: OdooModule[];
  total: number;
}

type TagType = 'green' | 'warm-gray' | 'red' | 'gray' | 'blue' | 'teal' | 'cyan';

const STATE_LABELS: Record<string, string> = {
  installed: '설치됨',
  to_upgrade: '업그레이드 대기',
  to_remove: '제거 예정',
  uninstalled: '미설치',
  to_install: '설치 예정',
};

const STATE_TYPES: Record<string, TagType> = {
  installed: 'green',
  to_upgrade: 'cyan',
  to_remove: 'red',
  uninstalled: 'gray',
  to_install: 'blue',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  transition: 'box-shadow 0.15s ease',
  cursor: 'default',
};

const cardHoverStyle: React.CSSProperties = {
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
};

interface ModuleCardProps {
  mod: OdooModule;
  actionLoading: string | null;
  onInstall: (mod: OdooModule) => void;
  onUninstall: (mod: OdooModule) => void;
}

function ModuleCard({ mod, actionLoading, onInstall, onUninstall }: ModuleCardProps) {
  const [hovered, setHovered] = useState(false);
  const isActing = actionLoading?.startsWith(mod.name) ?? false;
  const categoryName =
    mod.category_id && Array.isArray(mod.category_id) ? mod.category_id[1] : null;

  return (
    <div
      style={{ ...cardStyle, ...(hovered ? cardHoverStyle : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 아이콘 + 앱 이름 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            flexShrink: 0,
            background: '#f4f4f4',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {mod.icon_data ? (
            <img
              src={`data:image/png;base64,${mod.icon_data}`}
              alt={mod.shortdesc || mod.name}
              style={{ width: '64px', height: '64px', objectFit: 'cover' }}
            />
          ) : (
            <Application size={32} style={{ color: '#8d8d8d' }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.9rem',
              color: '#161616',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {mod.shortdesc || mod.name}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6f6f6f',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {mod.name}
          </div>
        </div>
      </div>

      {/* 설명 (2줄 clamp) */}
      <div
        style={{
          fontSize: '0.8rem',
          color: '#525252',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '2.4em',
          lineHeight: '1.2em',
        }}
      >
        {mod.description || mod.shortdesc || '-'}
      </div>

      {/* 카테고리 */}
      <div style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>
        {categoryName || '카테고리 없음'}
      </div>

      {/* 상태 뱃지 + 버튼 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid #f4f4f4',
        }}
      >
        <Tag type={STATE_TYPES[mod.state] ?? 'gray'} size="sm">
          {STATE_LABELS[mod.state] ?? mod.state}
        </Tag>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isActing && <InlineLoading style={{ width: '20px' }} />}
          {(mod.state === 'uninstalled' || mod.state === 'to_install') && (
            <Button
              kind="primary"
              size="sm"
              renderIcon={Add}
              disabled={!!actionLoading}
              onClick={() => onInstall(mod)}
              iconDescription="설치"
              hasIconOnly
            />
          )}
          {(mod.state === 'installed' ||
            mod.state === 'to_upgrade' ||
            mod.state === 'to_remove') && (
            <Button
              kind="danger--ghost"
              size="sm"
              renderIcon={TrashCan}
              disabled={!!actionLoading}
              onClick={() => onUninstall(mod)}
              iconDescription="제거"
              hasIconOnly
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppEngineModulesPage() {
  const [modules, setModules] = useState<OdooModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    kind: 'success' | 'error';
    title: string;
    subtitle: string;
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    module: OdooModule | null;
    action: 'install' | 'uninstall' | null;
  }>({ open: false, module: null, action: null });

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ModulesResponse>('/appengine/modules');
      setModules(res.modules || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AppEngine 모듈 목록 조회 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    modules.forEach((m) => {
      if (m.category_id && Array.isArray(m.category_id)) {
        cats.set(String(m.category_id[0]), m.category_id[1]);
      }
    });
    return Array.from(cats.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [modules]);

  // 필터링된 모듈
  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules.filter((m) => {
      if (stateFilter !== 'all' && m.state !== stateFilter) return false;
      if (categoryFilter !== 'all') {
        const catId =
          m.category_id && Array.isArray(m.category_id) ? String(m.category_id[0]) : '';
        if (catId !== categoryFilter) return false;
      }
      if (q) {
        const haystack = `${m.name} ${m.shortdesc} ${m.author} ${m.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [modules, stateFilter, categoryFilter, searchQuery]);

  const handleAction = async (mod: OdooModule, action: 'install' | 'uninstall') => {
    setConfirmModal({ open: false, module: null, action: null });
    const key = `${mod.name}-${action}`;
    setActionLoading(key);
    setNotification(null);
    try {
      await apiFetch(`/appengine/modules/${encodeURIComponent(mod.name)}/${action}`, {
        method: 'POST',
      });
      setNotification({
        kind: 'success',
        title: '작업 요청 완료',
        subtitle: `'${mod.shortdesc || mod.name}' ${action === 'install' ? '설치' : '제거'} 요청이 전송되었습니다. 처리까지 시간이 걸릴 수 있습니다.`,
      });
      setTimeout(fetchModules, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      setNotification({ kind: 'error', title: '작업 실패', subtitle: msg });
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (mod: OdooModule, action: 'install' | 'uninstall') => {
    setConfirmModal({ open: true, module: mod, action });
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f4' }}>
          모듈/앱 설치 관리
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#8d8d8d' }}>
          AppEngine(Odoo) 앱을 조회하고 설치/제거합니다
        </p>
      </div>

      {/* 알림 */}
      {notification && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind={notification.kind}
            title={notification.title}
            subtitle={notification.subtitle}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      {error && !loading && (
        <div style={{ marginBottom: '16px' }}>
          <InlineNotification
            kind="error"
            title="조회 실패"
            subtitle={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {/* 필터 툴바 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '24px',
          alignItems: 'flex-end',
        }}
      >
        <Select
          id="state-filter"
          labelText="상태"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          size="sm"
          style={{ minWidth: '160px' }}
        >
          <SelectItem value="all" text="전체 상태" />
          <SelectItem value="installed" text="설치됨" />
          <SelectItem value="uninstalled" text="미설치" />
          <SelectItem value="to_upgrade" text="업그레이드 대기" />
        </Select>

        <Select
          id="category-filter"
          labelText="카테고리"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          size="sm"
          style={{ minWidth: '200px' }}
        >
          <SelectItem value="all" text="전체 카테고리" />
          {categories.map(([id, name]) => (
            <SelectItem key={id} value={id} text={name} />
          ))}
        </Select>

        <div style={{ flexGrow: 1, minWidth: '240px' }}>
          <Search
            id="module-search"
            labelText="검색"
            placeholder="앱 이름, 설명, 개발사 검색..."
            size="sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </div>

        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          onClick={fetchModules}
          disabled={loading}
          iconDescription="새로고침"
        >
          새로고침
        </Button>

        <div
          style={{
            alignSelf: 'flex-end',
            color: '#8d8d8d',
            fontSize: '0.8rem',
            paddingBottom: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? '로딩 중...' : `${filteredModules.length}개`}
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8d8d8d' }}>
          <InlineLoading description="앱 목록 로딩 중..." />
        </div>
      ) : filteredModules.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#8d8d8d',
            fontSize: '0.9rem',
          }}
        >
          표시할 앱이 없습니다
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredModules.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              actionLoading={actionLoading}
              onInstall={(m) => openConfirm(m, 'install')}
              onUninstall={(m) => openConfirm(m, 'uninstall')}
            />
          ))}
        </div>
      )}

      {/* 확인 모달 */}
      <Modal
        open={confirmModal.open}
        modalHeading={confirmModal.action === 'install' ? '앱 설치 확인' : '앱 제거 확인'}
        primaryButtonText={confirmModal.action === 'install' ? '설치' : '제거'}
        secondaryButtonText="취소"
        danger={confirmModal.action === 'uninstall'}
        onRequestClose={() => setConfirmModal({ open: false, module: null, action: null })}
        onSecondarySubmit={() => setConfirmModal({ open: false, module: null, action: null })}
        onRequestSubmit={() => {
          if (confirmModal.module && confirmModal.action) {
            handleAction(confirmModal.module, confirmModal.action);
          }
        }}
      >
        <p>
          <strong>{confirmModal.module?.shortdesc || confirmModal.module?.name}</strong> 앱을{' '}
          {confirmModal.action === 'install' ? '설치' : '제거'}하시겠습니까?
        </p>
        {confirmModal.action === 'uninstall' && (
          <p style={{ color: '#fa4d56', marginTop: '8px' }}>
            제거 시 해당 앱의 데이터와 설정이 영향을 받을 수 있습니다.
          </p>
        )}
        <p style={{ marginTop: '8px', color: '#8d8d8d', fontSize: '0.875rem' }}>
          모듈명: <code>{confirmModal.module?.name}</code>
        </p>
      </Modal>
    </div>
  );
}
