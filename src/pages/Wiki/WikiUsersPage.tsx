import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import {
  Button, InlineNotification, DataTable, Table, TableHead, TableRow, TableHeader, 
  TableBody, TableCell, DataTableSkeleton, Tag
} from '@carbon/react';
import { Launch } from '@carbon/icons-react';

interface User {
  id: string;
  name: string;
  email: string;
  department?: string;
  enabled: boolean;
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/v1/users');
  if (!res.ok) {
    throw new Error('사용자 목록 조회 실패');
  }
  return res.json();
}

export default function WikiUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const enabledUsers = users.filter(u => u.enabled);

  const headers = [
    { key: 'name', header: '이름' },
    { key: 'email', header: '이메일' },
    { key: 'department', header: '부서' },
    { key: 'status', header: '상태' },
  ];

  const rows = enabledUsers.map((user, index) => ({
    id: user.id || index.toString(),
    name: user.name,
    email: user.email,
    department: user.department || '-',
    status: user.enabled ? '활성' : '비활성',
  }));

  return (
    <>
      <PageHeader 
        title="사용자" 
        description="위키 사용자 관리"
        actions={
          <Button
            kind="primary"
            renderIcon={Launch}
            onClick={() => window.open('https://wiki.cmars.com', '_blank')}
          >
            위키에서 확인
          </Button>
        }
      />

      <div style={{ marginBottom: '2rem' }}>
        <InlineNotification
          kind="info"
          title="OIDC 기반 사용자 관리"
          subtitle="AFFiNE은 Keycloak SSO를 통해 인증하며, 사용자는 첫 로그인 시 자동으로 생성됩니다. 아래는 AD에서 가져온 사용자 목록입니다."
          lowContrast
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>통계</h4>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Tag type="blue">전체 사용자: {enabledUsers.length}명</Tag>
          <Tag type="green">OIDC 인증</Tag>
          <Tag>자동 프로비저닝</Tag>
        </div>
      </div>

      {loading ? (
        <DataTableSkeleton headers={headers} />
      ) : error ? (
        <>
          <InlineNotification
            kind="error"
            title="사용자 목록 조회 실패"
            subtitle={error}
          />
          <Button kind="tertiary" size="sm" onClick={() => window.location.reload()} style={{ marginTop: '1rem' }}>
            재시도
          </Button>
        </>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(header => (
                    <TableHeader {...getHeaderProps({ header })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow {...getRowProps({ row })}>
                    {row.cells.map(cell => (
                      <TableCell key={cell.id}>
                        {cell.id.endsWith(':status') ? (
                          <Tag type={cell.value === '활성' ? 'green' : 'gray'}>
                            {cell.value}
                          </Tag>
                        ) : (
                          cell.value
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}

      <div style={{ marginTop: '2rem' }}>
        <InlineNotification
          kind="warning"
          title="사용자 관리 제한"
          subtitle="위키 사용자는 AFFiNE에서 자동 관리되므로, 이 화면에서는 조회만 가능합니다. 사용자 권한 변경은 Keycloak Admin Console에서 수행하세요."
          lowContrast
        />
      </div>
    </>
  );
}