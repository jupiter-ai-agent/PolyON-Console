// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TableContainer,
  Tag,
  Button,
  Select,
  SelectItem,
  InlineNotification,
  InlineLoading,
  Modal,
} from '@carbon/react';
import { Renew, TrashCan, Package, Upgrade } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';

interface OdooModule {
  id: number;
  name: string;
  shortdesc: string;
  state: string;
  author: string;
  description: string;
  category_id: [number, string] | false | null;
}

interface ModulesResponse {
  modules: OdooModule[];
  total: number;
}

const STATE_LABELS: Record<string, string> = {
  installed: '설치됨',
  to_upgrade: '업그레이드 대기',
  to_remove: '제거 예정',
  uninstalled: '미설치',
  to_install: '설치 예정',
};

const STATE_TYPES: Record<string, 'green' | 'warm-gray' | 'red' | 'gray' | 'blue' | 'teal'> = {
  installed: 'green',
  to_upgrade: 'teal',
  to_remove: 'red',
  uninstalled: 'gray',
  to_install: 'blue',
};

const HEADERS = [
  { key: 'name', header: '모듈명' },
  { key: 'shortdesc', header: '설명' },
  { key: 'category', header: '카테고리' },
  { key: 'author', header: '개발사' },
  { key: 'state', header: '상태' },
  { key: 'actions', header: '작업' },
];

export default function AppEngineModulesPage() {
  const [modules, setModules] = useState<OdooModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ kind: 'success' | 'error'; title: string; subtitle: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; module: OdooModule | null; action: 'install' | 'upgrade' | 'uninstall' | null }>({ open: false, module: null, action: null });

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ModulesResponse>('/api/v1/appengine/modules');
      setModules(res.modules || []);
    } catch (err: any) {
      setError(err.message || 'AppEngine 모듈 목록 조회 실패');
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
    modules.forEach(m => {
      if (m.category_id && Array.isArray(m.category_id)) {
        cats.set(String(m.category_id[0]), m.category_id[1]);
      }
    });
    return Array.from(cats.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [modules]);

  // 필터링된 모듈
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      if (stateFilter !== 'all' && m.state !== stateFilter) return false;
      if (categoryFilter !== 'all') {
        const catId = m.category_id && Array.isArray(m.category_id) ? String(m.category_id[0]) : '';
        if (catId !== categoryFilter) return false;
      }
      return true;
    });
  }, [modules, stateFilter, categoryFilter]);

  // DataTable 행 형식으로 변환
  const rows = useMemo(() =>
    filteredModules.map(m => ({
      id: String(m.id),
      name: m.name,
      shortdesc: m.shortdesc || '-',
      category: m.category_id && Array.isArray(m.category_id) ? m.category_id[1] : '-',
      author: m.author || '-',
      state: m.state,
      _raw: m,
    })),
    [filteredModules]
  );

  const handleAction = async (mod: OdooModule, action: 'install' | 'upgrade' | 'uninstall') => {
    setConfirmModal({ open: false, module: null, action: null });
    const key = `${mod.name}-${action}`;
    setActionLoading(key);
    setNotification(null);
    try {
      await apiFetch(`/api/v1/appengine/modules/${encodeURIComponent(mod.name)}/${action}`, { method: 'POST' });
      setNotification({
        kind: 'success',
        title: '작업 요청 완료',
        subtitle: `'${mod.shortdesc || mod.name}' ${STATE_LABELS[mod.state] ?? action} 요청이 전송되었습니다. 처리까지 시간이 걸릴 수 있습니다.`,
      });
      // 잠시 후 목록 갱신
      setTimeout(fetchModules, 3000);
    } catch (err: any) {
      setNotification({
        kind: 'error',
        title: '작업 실패',
        subtitle: err.message || '알 수 없는 오류',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openConfirm = (mod: OdooModule, action: 'install' | 'upgrade' | 'uninstall') => {
    setConfirmModal({ open: true, module: mod, action });
  };

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f4f4f4' }}>모듈/앱 설치 관리</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#8d8d8d' }}>
            AppEngine(Odoo)에 설치된 모듈을 조회하고 관리합니다
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            onClick={fetchModules}
            disabled={loading}
          >
            새로고침
          </Button>
        </div>
      </div>

      {/* 알림 */}
      {notification && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind={notification.kind}
            title={notification.title}
            subtitle={notification.subtitle}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div style={{ marginBottom: '1rem' }}>
          <InlineNotification
            kind="error"
            title="조회 실패"
            subtitle={error}
            onClose={() => setError(null)}
          />
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <Select
          id="state-filter"
          labelText="상태 필터"
          value={stateFilter}
          onChange={e => setStateFilter(e.target.value)}
          size="sm"
          style={{ maxWidth: '200px' }}
        >
          <SelectItem value="all" text="전체 상태" />
          <SelectItem value="installed" text="설치됨" />
          <SelectItem value="to_upgrade" text="업그레이드 대기" />
          <SelectItem value="to_remove" text="제거 예정" />
        </Select>
        <Select
          id="category-filter"
          labelText="카테고리 필터"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          size="sm"
          style={{ maxWidth: '220px' }}
        >
          <SelectItem value="all" text="전체 카테고리" />
          {categories.map(([id, name]) => (
            <SelectItem key={id} value={id} text={name} />
          ))}
        </Select>
        <div style={{ alignSelf: 'flex-end', color: '#8d8d8d', fontSize: '0.875rem', paddingBottom: '0.25rem' }}>
          {loading ? '로딩 중...' : `총 ${filteredModules.length}개`}
        </div>
      </div>

      {/* DataTable */}
      <DataTable rows={rows} headers={HEADERS} isSortable>
        {({ rows: tableRows, headers, getTableProps, getHeaderProps, getRowProps, onInputChange }) => (
          <TableContainer>
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch
                  onChange={onInputChange}
                  placeholder="모듈명, 설명, 개발사 검색..."
                  persistent
                />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} size="sm">
              <TableHead>
                <TableRow>
                  {headers.map(header => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={HEADERS.length}>
                      <InlineLoading description="모듈 목록 로딩 중..." />
                    </TableCell>
                  </TableRow>
                ) : tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={HEADERS.length} style={{ textAlign: 'center', color: '#8d8d8d' }}>
                      표시할 모듈이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map(row => {
                    const mod = filteredModules.find(m => String(m.id) === row.id);
                    const isActing = mod ? actionLoading?.startsWith(mod.name) : false;
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map(cell => {
                          if (cell.info.header === 'state') {
                            const stateVal = cell.value as string;
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={STATE_TYPES[stateVal] ?? 'gray'} size="sm">
                                  {STATE_LABELS[stateVal] ?? stateVal}
                                </Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'actions') {
                            return (
                              <TableCell key={cell.id}>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  {mod?.state === 'uninstalled' || mod?.state === 'to_install' ? (
                                    <Button
                                      kind="primary"
                                      size="sm"
                                      renderIcon={Package}
                                      disabled={!!actionLoading}
                                      onClick={() => mod && openConfirm(mod, 'install')}
                                      iconDescription="설치"
                                      hasIconOnly
                                    />
                                  ) : null}
                                  {mod?.state === 'installed' || mod?.state === 'to_upgrade' ? (
                                    <Button
                                      kind="tertiary"
                                      size="sm"
                                      renderIcon={Upgrade}
                                      disabled={!!actionLoading}
                                      onClick={() => mod && openConfirm(mod, 'upgrade')}
                                      iconDescription="업그레이드"
                                      hasIconOnly
                                    />
                                  ) : null}
                                  {mod?.state !== 'uninstalled' ? (
                                    <Button
                                      kind="danger--ghost"
                                      size="sm"
                                      renderIcon={TrashCan}
                                      disabled={!!actionLoading}
                                      onClick={() => mod && openConfirm(mod, 'uninstall')}
                                      iconDescription="제거"
                                      hasIconOnly
                                    />
                                  ) : null}
                                  {isActing && <InlineLoading style={{ width: '1.5rem' }} />}
                                </div>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={cell.id} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cell.value as string}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>

      {/* 확인 모달 */}
      <Modal
        open={confirmModal.open}
        modalHeading={
          confirmModal.action === 'install' ? '모듈 설치 확인' :
          confirmModal.action === 'upgrade' ? '모듈 업그레이드 확인' :
          '모듈 제거 확인'
        }
        primaryButtonText={
          confirmModal.action === 'install' ? '설치' :
          confirmModal.action === 'upgrade' ? '업그레이드' :
          '제거'
        }
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
          <strong>{confirmModal.module?.shortdesc || confirmModal.module?.name}</strong> 모듈을{' '}
          {confirmModal.action === 'install' ? '설치' :
           confirmModal.action === 'upgrade' ? '업그레이드' :
           '제거'}하시겠습니까?
        </p>
        {confirmModal.action === 'uninstall' && (
          <p style={{ color: '#fa4d56', marginTop: '0.5rem' }}>
            제거 시 해당 모듈의 데이터와 설정이 영향을 받을 수 있습니다.
          </p>
        )}
        <p style={{ marginTop: '0.5rem', color: '#8d8d8d', fontSize: '0.875rem' }}>
          모듈명: <code>{confirmModal.module?.name}</code>
        </p>
      </Modal>
    </div>
  );
}
