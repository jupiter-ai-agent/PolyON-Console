import { PageHeader } from '../../components/PageHeader';
import { Button, InlineNotification } from '@carbon/react';
import { Launch } from '@carbon/icons-react';

export default function WikiWorkspacesPage() {
  return (
    <>
      <PageHeader 
        title="워크스페이스" 
        description="위키 워크스페이스 관리"
        actions={
          <Button
            kind="primary"
            renderIcon={Launch}
            onClick={() => window.open('https://wiki.cmars.com', '_blank')}
          >
            위키에서 관리
          </Button>
        }
      />

      <div style={{ maxWidth: '800px' }}>
        <InlineNotification
          kind="info"
          title="워크스페이스 관리"
          subtitle="AFFiNE 워크스페이스는 위키 UI에서 직접 생성하고 관리할 수 있습니다. 각 사용자가 개인 워크스페이스를 만들거나 팀과 공유할 수 있습니다."
          lowContrast
        />

        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>워크스페이스 기능</h4>
          <ul style={{ 
            listStyle: 'disc', 
            paddingLeft: '1.5rem', 
            lineHeight: '1.6',
            color: 'var(--cds-text-secondary)'
          }}>
            <li>개인 워크스페이스 생성</li>
            <li>팀 워크스페이스 공유</li>
            <li>실시간 협업 편집</li>
            <li>문서 버전 관리</li>
            <li>블록 기반 에디터</li>
            <li>템플릿 시스템</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>사용법</h4>
          <ol style={{ 
            listStyle: 'decimal', 
            paddingLeft: '1.5rem', 
            lineHeight: '1.6',
            color: 'var(--cds-text-secondary)'
          }}>
            <li>위 "위키에서 관리" 버튼을 클릭하여 AFFiNE에 접속</li>
            <li>Keycloak SSO로 로그인</li>
            <li>새 워크스페이스 생성 또는 기존 워크스페이스 선택</li>
            <li>팀원과 워크스페이스 공유 설정</li>
          </ol>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <InlineNotification
            kind="warning"
            title="OIDC 인증"
            subtitle="워크스페이스 관리는 AFFiNE UI를 통해서만 가능하며, 관리자 Console에서는 조회 기능만 제공됩니다."
            lowContrast
          />
        </div>
      </div>
    </>
  );
}