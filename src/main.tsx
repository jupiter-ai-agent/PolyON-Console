import React, { StrictMode, useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import * as ReactRouterDOM from 'react-router-dom';
import * as CarbonReact from '@carbon/react';
import * as CarbonIcons from '@carbon/icons-react';
import { Loading, Button } from '@carbon/react';
import { apiFetch } from './api/client';
import { useAuth } from './auth/useAuth';
import { PageHeader } from './components/PageHeader';
import { initAuth, type AuthState } from './auth/useAuth';
import './styles/app.scss';
import App from './App';

// ── PolyON SDK 글로벌 노출 ─────────────────────────────────────────────────────
window.__POLYON__ = {
  React,
  ReactDOM,
  ReactRouterDOM,
  CarbonReact,
  CarbonIcons,
  sdk: {
    apiFetch,
    useAuth,
    PageHeader,
  },
  version: {
    sdk: '1.0.0',
    react: React.version,
    carbon: '1.102.0',
  },
};

function AuthErrorScreen({ error }: { error: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#262626',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      <div style={{
        background: '#393939',
        borderRadius: '8px',
        padding: '2.5rem',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ color: '#f4f4f4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          인증 서버 연결 실패
        </h2>
        <p style={{ color: '#c6c6c6', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
          {error}
        </p>
        <Button
          kind="primary"
          onClick={() => window.location.reload()}
          style={{ width: '100%' }}
        >
          다시 시도
        </Button>
      </div>
    </div>
  );
}

function AppLoader() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth()
      .then((state) => {
        setAuthState(state);
        setLoading(false);
      });
    // initAuth never rejects — errors are in state.error
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#262626',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <Loading withOverlay={false} />
        <p style={{ color: '#c6c6c6', fontSize: '0.875rem' }}>
          인증 중...
        </p>
      </div>
    );
  }

  // 인증 실패 → 차단 화면 (절대 우회 불가)
  if (authState?.error) {
    return <AuthErrorScreen error={authState.error} />;
  }

  // 미인증 → 차단 (Keycloak redirect가 일어나야 하므로 여기 도달하면 안 됨)
  if (!authState?.authenticated) {
    return <AuthErrorScreen error="인증되지 않았습니다. 페이지를 새로고침하세요." />;
  }

  return <App />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppLoader />
  </StrictMode>
);
