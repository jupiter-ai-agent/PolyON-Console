import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import {
  InlineNotification, Tag,
  DataTableSkeleton
} from '@carbon/react';

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

export default function DriveSettingsPage() {
  const [status, setStatus] = useState<'healthy' | 'down' | 'unknown'>('unknown');
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const statusRes = await driveFetch<DriveStatus>('/status');
      setDriveStatus(statusRes);
      setStatus(statusRes.installed && !statusRes.maintenance ? 'healthy' : 'down');
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 정보 로딩 실패');
      setStatus('down');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageHeader
        title="Drive 설정"
        description="Nextcloud 서비스 설정 및 상태 정보"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <StatusBadge status={status} />
          </div>
        }
      />

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
          {/* 서비스 상태 */}
          <div style={{ 
            background: '#fff', 
            border: '1px solid #e0e0e0', 
            padding: '1.5rem',
            borderRadius: '4px',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>서비스 상태</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge status={status} />
                {driveStatus?.version && (
                  <Tag type="cool-gray" size="sm">
                    v{driveStatus.version}
                  </Tag>
                )}
              </div>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1rem' 
            }}>
              <div>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--cds-text-helper)',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>
                  제품명
                </label>
                <div style={{ fontSize: '0.875rem' }}>
                  {driveStatus?.product || '—'}
                </div>
              </div>

              <div>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--cds-text-helper)',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>
                  버전
                </label>
                <div style={{ fontSize: '0.875rem' }}>
                  {driveStatus?.version || '—'}
                </div>
              </div>

              <div>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--cds-text-helper)',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>
                  설치 상태
                </label>
                <div style={{ fontSize: '0.875rem' }}>
                  <Tag type={driveStatus?.installed ? 'green' : 'red'} size="sm">
                    {driveStatus?.installed ? '설치됨' : '설치되지 않음'}
                  </Tag>
                </div>
              </div>

              <div>
                <label style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--cds-text-helper)',
                  display: 'block',
                  marginBottom: '0.25rem'
                }}>
                  유지보수 모드
                </label>
                <div style={{ fontSize: '0.875rem' }}>
                  <Tag type={driveStatus?.maintenance ? 'red' : 'green'} size="sm">
                    {driveStatus?.maintenance ? '활성' : '비활성'}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          {/* 사용량 통계 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '1rem', 
            marginTop: '1.5rem' 
          }}>
            <StatCard 
              label="팀 폴더 수" 
              value={driveStatus?.team_folders || 0} 
              sub="Team Folders" 
            />
            <StatCard 
              label="총 사용량" 
              value={driveStatus?.total_size ? formatBytes(driveStatus.total_size) : '—'} 
              sub="Total Storage Used" 
            />
          </div>

          {/* 정보 카드 */}
          <div style={{ 
            background: '#f4f4f4', 
            border: '1px solid #e0e0e0', 
            padding: '1.5rem',
            borderRadius: '4px',
            marginTop: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
              설정 정보
            </h4>
            <p style={{ 
              margin: '0 0 0.75rem 0', 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)', 
              lineHeight: '1.5' 
            }}>
              현재 Nextcloud 서비스의 기본 상태 정보를 확인할 수 있습니다.
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              color: 'var(--cds-text-secondary)', 
              lineHeight: '1.5' 
            }}>
              <strong>주의:</strong> 고급 설정 변경은 Nextcloud 관리자 인터페이스에서 직접 수행하시기 바랍니다.
            </p>
          </div>
        </>
      )}
    </>
  );
}