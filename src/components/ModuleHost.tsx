/**
 * ModuleHost — 모듈 UI를 동적 로드하여 마운트
 */
import { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { InlineNotification, SkeletonText } from '@carbon/react';

interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  pages?: Record<string, string>;
}

interface ModuleEntry {
  init?: () => Promise<void> | void;
  pages?: Record<string, () => ComponentType<any>>;
}

interface ModuleHostProps {
  moduleId: string;
  pageName: string;
}

export function ModuleHost({ moduleId, pageName }: ModuleHostProps) {
  const [component, setComponent] = useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadModule() {
      try {
        setLoading(true);
        setError(null);

        // 1. manifest.json fetch
        const manifestRes = await fetch(`/modules/${moduleId}/manifest.json`);
        if (!manifestRes.ok) {
          throw new Error(`Manifest 로드 실패: ${manifestRes.status}`);
        }
        
        const manifest: ModuleManifest = await manifestRes.json();

        // 2. entry.js dynamic import
        const entryPath = `/modules/${moduleId}/${manifest.entry || 'entry.js'}`;
        const moduleEntry = (await import(/* @vite-ignore */ entryPath)) as ModuleEntry;

        if (!mounted) return;

        // 3. entry.init() 호출 (있으면)
        if (moduleEntry.init) {
          await moduleEntry.init();
        }

        // 4. entry.pages[pageName]() 로딩
        if (!moduleEntry.pages || !moduleEntry.pages[pageName]) {
          throw new Error(`페이지 "${pageName}"을(를) 찾을 수 없습니다.`);
        }

        const PageComponent = moduleEntry.pages[pageName]();
        if (!mounted) return;

        setComponent(() => PageComponent);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setError(message);
        console.error(`Module ${moduleId} load error:`, err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadModule();

    return () => {
      mounted = false;
    };
  }, [moduleId, pageName]);

  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem' }}>
        <InlineNotification
          kind="error"
          title="모듈 로딩 실패"
          subtitle={error}
        />
      </div>
    );
  }

  if (!component) {
    return (
      <div style={{ padding: '1rem' }}>
        <InlineNotification
          kind="warning"
          title="페이지를 찾을 수 없습니다"
          subtitle={`모듈 "${moduleId}"에서 페이지 "${pageName}"을(를) 찾을 수 없습니다.`}
        />
      </div>
    );
  }

  const Component = component;
  return <Component />;
}