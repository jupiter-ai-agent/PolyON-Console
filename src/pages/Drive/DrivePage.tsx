import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Button, Tag, InlineNotification,
  DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell,
  DataTableSkeleton
} from '@carbon/react';
import { Renew } from '@carbon/icons-react';

const BASE = '/api/v1/drive';

async function driveFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface GroupFolder {
  id: number;
  mount_point: string;
  groups: Record<string, number>;
  quota: number;
  size: number;
}

interface DriveStatus {
  installed: boolean;
  version: string;
  maintenance: boolean;
  product: string;
  team_folders: number;
  total_size: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e0e0e0', 
      padding: '1.25rem',
      borderRadius: '4px'
    }}>
      <div style={{ 
        fontSize: '0.6875rem', 
        fontWeight: 600, 
        textTransform: 'uppercase', 
        letterSpacing: '0.32px', 
        color: 'var(--cds-text-helper)' 
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '2rem', 
        fontWeight: 300, 
        marginTop: '0.5rem',
        color: 'var(--cds-text-primary)'
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--cds-text-secondary)', 
          marginTop: '0.25rem' 
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '무제한';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const folderHeaders = [
  { key: 'name', header: '폴더 이름' },
  { key: 'groups', header: '그룹' },
  { key: 'quota', header: '할당량' },
  { key: 'usage', header: '사용량' },
];

export default function DrivePage() {
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'healthy' | 'down' | 'unknown'>('unknown');
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [folders, setFolders] = useState<GroupFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // Status 확인
      try {
        const statusRes = await driveFetch<DriveStatus>('/status');
        setDriveStatus(statusRes);
        setStatus(statusRes.installed && !statusRes.maintenance ? 'healthy' : 'down');
      } catch {
        setStatus('down');
      }

      // 최근 팀 폴더 로딩
      try {
        const foldersRes = await driveFetch<{ success: boolean; folders: GroupFolder[]; count: number }>('/folders');
        if (foldersRes.success) {
          setFolders(Array.isArray(foldersRes.folders) ? foldersRes.folders.slice(0, 5) : []);
        }
      } catch (err) {
        console.warn('Failed to load folders:', err);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleLdapSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    
    try {
      const result = await driveFetch<{ created: number; updated: number; skipped: number; errors: string[] }>('/ldap-sync', { method: 'POST' });
      setSyncMessage({ 
        type: 'success', 
        text: `LDAP 동기화 완료: 생성 ${result.created}개, 업데이트 ${result.updated}개, 건너뜀 ${result.skipped}개` 
      });
    } catch (err) {
      setSyncMessage({ 
        type: 'error', 
        text: `LDAP 동기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}` 
      });
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const folderRows = folders.map((folder, i) => ({
    id: String(folder.id || i),
    name: folder.mount_point || '—',
    groups: Object.keys(folder.groups).join(', ') || '없음',
    quota: formatBytes(folder.quota),
    usage: (
      <div>
        <span style={{ fontSize: '0.875rem' }}>{formatBytes(folder.size)}</span>
        {folder.quota > 0 && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--cds-text-secondary)',
            marginTop: '2px'
          }}>
            {((folder.size / folder.quota) * 100).toFixed(1)}% 사용
          </div>
        )}
      </div>
    ),
  }));

  return (
    <>
      <PageHeader
        title={
          <>
            Drive (Nextcloud)
            {driveStatus?.version && (
              <Tag type="cool-gray" size="sm" style={{ marginLeft: '8px', verticalAlign: 'middle' }}>
                v{driveStatus.version}
              </Tag>
            )}
          </>
        }
        description="파일 스토리지 관리"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={status} />
            <Button
              kind="secondary"
              size="sm"
              renderIcon={Renew}
              disabled={syncLoading}
              onClick={handleLdapSync}
            >
              {syncLoading ? 'LDAP 동기화 중...' : 'LDAP 동기화'}
            </Button>
          </div>
        }
      />

      {/* Sync notification */}
      {syncMessage && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={syncMessage.type}
            title={syncMessage.type === 'success' ? '성공' : '오류'}
            subtitle={syncMessage.text}
            onCloseButtonClick={() => setSyncMessage(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="데이터 로딩 오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: '1.5rem' }}>
          <DataTableSkeleton />
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem', 
            marginTop: '1.5rem' 
          }}>
            <StatCard 
              label="Nextcloud 버전" 
              value={driveStatus?.version || '—'} 
              sub="Version" 
            />
            <StatCard 
              label="팀 폴더 수" 
              value={driveStatus?.team_folders || 0} 
              sub="Team Folders" 
            />
            <StatCard 
              label="총 사용량" 
              value={driveStatus?.total_size ? formatBytes(driveStatus.total_size) : '—'} 
              sub="Total Storage" 
            />
            <StatCard 
              label="서비스 상태" 
              value={driveStatus?.maintenance ? '유지보수' : '정상'} 
              sub={driveStatus?.product || 'Nextcloud'} 
            />
          </div>

          {/* 빠른 링크 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '0.75rem', 
            marginTop: '1.5rem' 
          }}>
            {[
              { label: '팀 폴더 관리', path: '/drive/folders', desc: '팀 폴더 목록 및 설정', color: '#0f62fe' },
              { label: '사용자 관리', path: '/drive/users', desc: 'LDAP 동기화 관리', color: '#6929c4' },
              { label: '설정', path: '/drive/settings', desc: 'Nextcloud 서비스 설정', color: '#525252' },
            ].map(item => (
              <Button
                key={item.path}
                kind="ghost"
                onClick={() => navigate(item.path)}
                style={{
                  background: '#fff',
                  border: '1px solid #e0e0e0',
                  borderLeft: `3px solid ${item.color}`,
                  padding: '1rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  height: 'auto',
                  minHeight: '4rem',
                  color: '#161616',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                  {item.label}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--cds-text-secondary)', 
                  marginTop: '0.25rem', 
                  fontWeight: 400, 
                  display: 'block' 
                }}>
                  {item.desc}
                </span>
              </Button>
            ))}
          </div>

          {/* 최근 팀 폴더 목록 */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
            <div style={{ 
              padding: '1rem 1.25rem', 
              borderBottom: '1px solid #e0e0e0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>최근 팀 폴더</h4>
              <Button kind="ghost" size="sm" onClick={() => navigate('/drive/folders')}>
                전체 보기
              </Button>
            </div>
            {folderRows.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: 'var(--cds-text-secondary)', 
                fontSize: '0.875rem' 
              }}>
                팀 폴더가 없습니다.
              </div>
            ) : (
              <DataTable rows={folderRows} headers={folderHeaders}>
                {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
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
                      {tableRows.map(row => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          {row.cells.map(cell => (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            )}
          </div>
        </>
      )}
    </>
  );
}