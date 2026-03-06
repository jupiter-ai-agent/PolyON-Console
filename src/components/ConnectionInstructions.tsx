// @ts-nocheck
interface ConnectionInstructionsProps {
  commands: {
    label: string;
    command: string;
  }[];
}

export function ConnectionInstructions({ commands }: ConnectionInstructionsProps) {
  return (
    <div style={{ background: '#f4f4f4', border: '1px solid var(--cds-border-subtle-00)', padding: '1.5rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>
        접속 방법
      </h4>
      <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--cds-text-secondary)' }}>
        {commands.map((cmd, index) => (
          <div key={index} style={{ marginBottom: index === commands.length - 1 ? '0' : '1rem' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>{cmd.label}:</strong>
            </p>
            <code style={{ background: '#262626', color: '#f4f4f4', padding: '0.5rem', display: 'block', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
              {cmd.command}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}