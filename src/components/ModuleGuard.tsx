import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineNotification } from '@carbon/react';
import { ArrowLeft, Download } from '@carbon/icons-react';

interface ModuleGuardProps {
  moduleId: string;
  moduleName: string;
  children: ReactNode;
}

/**
 * ModuleGuard checks if a module is installed (active) before rendering children.
 * If not installed, shows a "module not installed" message with navigation options.
 */
export default function ModuleGuard({ moduleId, moduleName, children }: ModuleGuardProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'active' | 'not_installed'>('loading');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/v1/system/components');
        if (!res.ok) {
          setStatus('active'); // API 실패 시 일단 표시
          return;
        }
        const data = await res.json();
        const comp = (data.components || []).find((c: { id: string }) => c.id === moduleId);
        if (comp && comp.status === 'active') {
          setStatus('active');
        } else {
          setStatus('not_installed');
        }
      } catch {
        setStatus('active'); // 네트워크 에러 시 일단 표시
      }
    };
    check();
  }, [moduleId]);

  if (status === 'loading') return null;

  if (status === 'not_installed') {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '4rem auto', 
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: 64, height: 64,
          background: '#f4f4f4',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#8d8d8d',
        }}>
          {moduleName.charAt(0)}
        </div>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {moduleName} 미설치
        </h2>
        <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>
          이 모듈이 설치되어 있지 않습니다. 시스템 정보에서 설치할 수 있습니다.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Button
            kind="secondary"
            renderIcon={ArrowLeft}
            onClick={() => navigate(-1)}
          >
            뒤로가기
          </Button>
          <Button
            kind="primary"
            renderIcon={Download}
            onClick={() => navigate('/settings/sysinfo')}
          >
            시스템 정보에서 설치
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
