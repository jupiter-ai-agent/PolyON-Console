import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, InlineNotification, Tag,
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

interface LdapSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  details: Array<{
    action: 'created' | 'updated' | 'skipped' | 'error';
    user: string;
    message?: string;
  }>;
}

function StatCard({ label, value, sub, color }: { 
  label: string; 
  value: string | number; 
  sub?: string; 
  color?: string;
}) {
  return (
    <div style={{ 
      background: '#fff', 
      border: '1px solid #e0e0e0', 
      padding: '1.25rem',
      borderRadius: '4px',
      borderLeft: color ? `3px solid ${color}` : undefined,
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

const detailHeaders = [
  { key: 'action', header: '작업' },
  { key: 'user', header: '사용자' },
  { key: 'message', header: '메시지' },
];

export default function DriveUsersPage() {
  const [syncResult, setSyncResult] = useState<LdapSyncResult | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLdapSync = async () => {
    setSyncLoading(true);
    setError('');
    setNotification(null);
    setSyncResult(null);
    
    try {
      const result = await driveFetch<LdapSyncResult>('/ldap-sync', { method: 'POST' });
      setSyncResult(result);
      
      if (result.errors.length > 0) {
        setNotification({
          type: 'error',
          text: `동기화 완료되었지만 ${result.errors.length}개의 오류가 발생했습니다.`,
        });
      } else {
        setNotification({
          type: 'success',
          text: `LDAP 동기화가 성공적으로 완료되었습니다.`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LDAP 동기화 실패');
      setNotification({
        type: 'error',
        text: `LDAP 동기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const detailRows = syncResult?.details?.map((detail, i) => ({
    id: String(i),
    action: (
      <Tag
        type={
          detail.action === 'created' ? 'green' :
          detail.action === 'updated' ? 'blue' :
          detail.action === 'skipped' ? 'gray' :
          'red'
        }
        size="sm"
      >
        {
          detail.action === 'created' ? '생성' :
          detail.action === 'updated' ? '업데이트' :
          detail.action === 'skipped' ? '건너뜀' :
          '오류'
        }
      </Tag>
    ),
    user: detail.user || '—',
    message: detail.message || '—',
  })) || [];

  return (
    <>
      <PageHeader
        title="사용자 관리"
        description="LDAP 동기화 및 사용자 관리"
        actions={
          <Button
            kind="primary"
            size="sm"
            renderIcon={Renew}
            disabled={syncLoading}
            onClick={handleLdapSync}
          >
            {syncLoading ? 'LDAP 동기화 중...' : 'LDAP 동기화 시작'}
          </Button>
        }
      />

      {/* Notification */}
      {notification && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind={notification.type}
            title={notification.type === 'success' ? '성공' : '오류'}
            subtitle={notification.text}
            onCloseButtonClick={() => setNotification(null)}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <InlineNotification
            kind="error"
            title="동기화 오류"
            subtitle={error}
            onCloseButtonClick={() => setError('')}
          />
        </div>
      )}

      {/* 동기화 상태 정보 */}
      <div style={{ 
        background: '#fff', 
        border: '1px solid #e0e0e0', 
        padding: '1.5rem',
        borderRadius: '4px',
        marginTop: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
          LDAP 동기화 정보
        </h4>
        <p style={{ 
          margin: '0 0 1rem 0', 
          fontSize: '0.875rem', 
          color: 'var(--cds-text-secondary)', 
          lineHeight: '1.5' 
        }}>
          Active Directory의 사용자 정보를 Nextcloud와 동기화합니다.<br />
          새로운 사용자는 생성되고, 기존 사용자는 정보가 업데이트됩니다.
        </p>
        
        {!syncResult ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: 'var(--cds-text-secondary)',
            background: '#f4f4f4',
            borderRadius: '4px'
          }}>
            {syncLoading ? (
              <div>
                <div style={{ marginBottom: '0.75rem' }}>LDAP 동기화 진행 중...</div>
                <DataTableSkeleton />
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '0.75rem' }}>동기화를 시작하려면 위의 버튼을 클릭하세요</div>
                <Button kind="ghost" size="sm" onClick={handleLdapSync}>
                  동기화 시작
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 동기화 결과 통계 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1rem', 
              marginBottom: '1.5rem' 
            }}>
              <StatCard 
                label="생성됨" 
                value={syncResult.created} 
                sub="새 사용자" 
                color="#24a148"
              />
              <StatCard 
                label="업데이트됨" 
                value={syncResult.updated} 
                sub="기존 사용자" 
                color="#0f62fe"
              />
              <StatCard 
                label="건너뜀" 
                value={syncResult.skipped} 
                sub="변경 없음" 
                color="#8d8d8d"
              />
              <StatCard 
                label="오류" 
                value={syncResult.errors.length} 
                sub="실패한 작업" 
                color="#da1e28"
              />
            </div>

            {/* 오류 목록 */}
            {syncResult.errors.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#da1e28' }}>
                  동기화 오류
                </h5>
                <div style={{ 
                  background: '#fff1f1', 
                  border: '1px solid #ffd7d9', 
                  padding: '0.75rem', 
                  borderRadius: '4px' 
                }}>
                  {syncResult.errors.map((error, i) => (
                    <div key={i} style={{ 
                      fontSize: '0.875rem', 
                      color: '#750e13', 
                      marginBottom: i < syncResult.errors.length - 1 ? '0.25rem' : 0 
                    }}>
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 동기화 상세 내역 */}
      {syncResult && detailRows.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', marginTop: '1.5rem' }}>
          <div style={{ 
            padding: '1rem 1.25rem', 
            borderBottom: '1px solid #e0e0e0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              동기화 상세 내역 ({detailRows.length}개)
            </h4>
          </div>
          
          <DataTable rows={detailRows} headers={detailHeaders}>
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
        </div>
      )}
    </>
  );
}