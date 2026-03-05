
import { Outlet } from 'react-router-dom';

export default function SetupLayout() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cds-background)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: 'var(--cds-text-primary)',
          }}
        >
          PolyON Setup
        </h1>
        <p style={{ color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
          Initial system configuration wizard
        </p>
        <Outlet />
      </div>
    </div>
  );
}
