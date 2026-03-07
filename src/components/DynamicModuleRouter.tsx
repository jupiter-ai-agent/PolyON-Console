/**
 * DynamicModuleRouter — 모듈 라우팅 처리
 */
import { useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ModuleHost } from './ModuleHost';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';

export function DynamicModuleRouter() {
  const location = useLocation();
  const { moduleNav } = useAppStore();

  // 현재 경로에서 모듈 찾기
  const moduleMatch = useMemo(() => {
    const pathname = location.pathname;

    for (const module of (moduleNav || [])) {
      // 각 모듈의 routes 확인
      for (const route of module.routes || []) {
        // 정확한 경로 매치
        if (pathname === route.path) {
          return {
            moduleId: module.id,
            pageName: route.component,
          };
        }
        
        // 와일드카드 경로 매치 (예: /module/* -> /module/anything)
        if (route.path.endsWith('/*')) {
          const basePath = route.path.slice(0, -2); // /* 제거
          if (pathname.startsWith(basePath)) {
            return {
              moduleId: module.id,
              pageName: route.component,
            };
          }
        }
      }

      // 기본 경로 체크 (defaultPath)
      if (pathname === module.defaultPath) {
        // 첫 번째 라우트의 컴포넌트 사용
        const firstRoute = module.routes?.[0];
        if (firstRoute) {
          return {
            moduleId: module.id,
            pageName: firstRoute.component,
          };
        }
      }
    }

    return null;
  }, [location.pathname, moduleNav]);

  // 매치되지 않으면 홈으로 리다이렉트
  if (!moduleMatch) {
    return <Navigate to="/" replace />;
  }

  // 모듈 컴포넌트 렌더링
  return (
    <ModuleErrorBoundary moduleId={moduleMatch.moduleId}>
      <ModuleHost
        moduleId={moduleMatch.moduleId}
        pageName={moduleMatch.pageName}
      />
    </ModuleErrorBoundary>
  );
}