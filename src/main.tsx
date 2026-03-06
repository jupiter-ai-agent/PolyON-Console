import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Loading } from '@carbon/react';
import { initAuth } from './auth/useAuth';
import './styles/app.scss';
import App from './App';

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