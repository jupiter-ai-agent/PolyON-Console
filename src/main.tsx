import React, { StrictMode, useState, useEffect } from 'react';
import * as ReactDOM from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import * as ReactRouterDOM from 'react-router-dom';
import * as CarbonReact from '@carbon/react';
import * as CarbonIcons from '@carbon/icons-react';
import { Loading } from '@carbon/react';
import { apiFetch } from './api/client';
import { useAuth } from './auth/useAuth';
import { PageHeader } from './components/PageHeader';
import { initAuth } from './auth/useAuth';
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

function AppLoader() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    initAuth()
      .then(() => {
        setAuthReady(true);
      })
      .catch((error) => {
        console.error('Auth initialization failed:', error);
        setAuthReady(true); // Continue anyway
      });
  }, []);

  if (!authReady) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        backgroundColor: '#f4f4f4',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <Loading withOverlay={false} />
        <p style={{ color: '#525252', fontSize: '0.875rem' }}>
          인증 중...
        </p>
      </div>
    );
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