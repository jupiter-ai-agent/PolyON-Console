import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  Tag,
  InlineNotification,
  Loading,
  InlineLoading,
  Link,
} from '@carbon/react';
import { Renew, GroupPresentation, Launch } from '@carbon/icons-react';
import { apiFetch } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ADGroup {
  id: number;
  name: string;
  comment: string;
  user_count: number;
}

interface ListADGroupsResponse {
  success: boolean;
  groups: ADGroup[];
  count: number;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  skipped?: number;
  errors?: number;
  message?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppEngineGroupSyncPage() {
  const [groups, setGroups] = useState<ADGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const ODOO_BASE_URL = import.meta.env.VITE_ODOO_URL || 'https://apps.cmars.com';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await apiFetch('/appengine/ad-groups') as ListADGroupsResponse;
      setGroups(res.groups ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await apiFetch('/appengine/group-sync', { method: 'POST' }) as SyncResult;
      setSyncResult(res);
      // 동기화 후 목록 갱신
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '동기화 실패');
    } finally {
      setSyncing(false);
    }
  };

  // ── DataTable ────────────────────────────────────────────────────────────────

  const headers = [
    { key: 'name', header: '그룹명' },
    { key: 'user_count', header: '사용자 수' },
    { key: 'comment', header: '설명' },
    { key: 'actions', header: '작업' },
  ];

  const rows = groups.map(g => ({
    id: String(g.id),
    name: g.name,
    user_count: g.user_count,
    comment: g.comment || '—',
    _odoo_id: g.id,
  }));

  return (
    <div>
      <PageHeader
        title="그룹 동기화"
        description="KC polyon realm의 LDAP 그룹이 Odoo [AD Group]으로 자동 동기화됩니다. 사용자 로그인 시 KC JWT groups 클레임 기반으로 그룹이 갱신됩니다."
        icon={GroupPresentation}
      />

      <div style={{ padding: '1.5rem' }}>
        {error && (
          <InlineNotification
            kind="error"
            title="오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
            style={{ marginBottom: '1rem' }}
          />
        )}

        {syncResult && (
          <InlineNotification
            kind="success"
            title="동기화 완료"
            subtitle={
              syncResult.message
                ? syncResult.message
                : `동기화: ${syncResult.synced ?? 0}명 / 건너뜀: ${syncResult.skipped ?? 0}명 / 오류: ${syncResult.errors ?? 0}명`
            }
            onCloseButtonClick={() => setSyncResult(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}

        {/* 설명 패널 */}
        <div style={{
          background: 'var(--cds-layer-01, #f4f4f4)',
          borderLeft: '4px solid var(--cds-interactive, #0f62fe)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: 1.6,
        }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>동기화 흐름</p>
          <p style={{ margin: 0, color: 'var(--cds-text-secondary, #525252)' }}>
            <strong>Samba DC (LDAP 그룹)</strong>
            &nbsp;→&nbsp;
            <strong>Keycloak polyon realm (groups JWT 클레임)</strong>
            &nbsp;→&nbsp;
            <strong>polyon_oidc (로그인 시 자동 동기화)</strong>
            &nbsp;→&nbsp;
            <strong>Odoo group_ids</strong>
          </p>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--cds-text-secondary, #525252)' }}>
            KC polyon realm에 <em>LDAP Group Membership Mapper</em>가 설정된 경우 JWT에 groups 클레임이 포함됩니다.
            미설정 시 동기화는 skip됩니다.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loading description="로딩 중..." withOverlay={false} />
          </div>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer
                title="Odoo [AD Group] 목록"
                description={`총 ${groups.length}개 — KC 로그인 시 자동 생성된 그룹입니다.`}
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={Renew}
                      iconDescription="새로 고침"
                      onClick={load}
                    >
                      새로 고침
                    </Button>
                    <Button
                      kind="primary"
                      size="sm"
                      renderIcon={syncing ? undefined : Renew}
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <InlineLoading description="" style={{ margin: 0 }} />
                          동기화 중...
                        </span>
                      ) : '수동 동기화'}
                    </Button>
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map(h => (
                        <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#6f6f6f' }}>
                          동기화된 그룹이 없습니다.
                          KC polyon realm에 LDAP Group Membership Mapper를 설정하면 로그인 시 자동 생성됩니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map(row => {
                        const raw = groups.find(g => String(g.id) === row.id);
                        return (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map(cell => {
                              if (cell.info.header === 'name') {
                                return (
                                  <TableCell key={cell.id}>
                                    <Tag type="cyan" size="sm">{String(cell.value)}</Tag>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'user_count') {
                                return (
                                  <TableCell key={cell.id}>
                                    <Tag type="blue" size="sm">
                                      {String(cell.value)}명
                                    </Tag>
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'comment') {
                                // [AD Group] 마커는 숨기고 나머지 설명만 표시
                                const desc = String(cell.value)
                                  .replace('[AD Group]', '')
                                  .replace('KC OIDC에서 자동 생성', '')
                                  .trim();
                                return (
                                  <TableCell key={cell.id} style={{ color: '#6f6f6f', fontSize: '0.8125rem' }}>
                                    {desc || '—'}
                                  </TableCell>
                                );
                              }
                              if (cell.info.header === 'actions') {
                                return (
                                  <TableCell key={cell.id}>
                                    <Link
                                      href={`${ODOO_BASE_URL}/odoo/action-base_setup.action_general_configuration`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}
                                    >
                                      Odoo에서 편집
                                      <Launch size={14} />
                                    </Link>
                                  </TableCell>
                                );
                              }
                              return <TableCell key={cell.id}>{String(cell.value)}</TableCell>;
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
        )}

        {/* KC 설정 안내 */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--cds-layer-01, #f4f4f4)', fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>KC Mapper 설정 방법</p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li>KC Admin Console → Realm: polyon → Clients → <code>polyon-appengine</code></li>
            <li>Client Scopes → Mappers → Add mapper → <em>Group Membership</em></li>
            <li>Token Claim Name: <code>groups</code> / Full group path: <em>OFF</em></li>
            <li>Add to access token: <em>ON</em></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
