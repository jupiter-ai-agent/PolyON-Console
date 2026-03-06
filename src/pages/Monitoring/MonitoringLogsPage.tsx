// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabList, Tab } from '@carbon/react';

const LOG_SERVICES = [
  { id: 'polyon-dc',         label: 'DC' },
  { id: 'polyon-core',       label: 'Core' },
  { id: 'polyon-db',         label: 'DB' },
  { id: 'polyon-redis',      label: 'Redis' },
  { id: 'polyon-search',         label: 'ES' },
  { id: 'polyon-auth',       label: 'Keycloak' },
  { id: 'polyon-mail',       label: 'Mail' },
  { id: 'polyon-rustfs',     label: 'RustFS' },
  { id: 'polyon-console',         label: 'UI' },
  { id: 'polyon-prometheus', label: 'Prometheus' },
  { id: 'polyon-grafana',    label: 'Grafana' },
];

function formatLog(raw: string): string {
  return raw.split('\n').map(line => {
    let colored = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Timestamp dim
    colored = colored.replace(
      /^(\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*)/,
      '<span style="color:#6f6f6f">$1</span>'
    );

    // Level highlights
    if (/\b(ERROR|CRITICAL|FATAL|CRIT)\b/i.test(line)) {
      colored = `<span style="color:#fa4d56">${colored}</span>`;
    } else if (/\b(WARN|WARNING)\b/i.test(line)) {
      colored = `<span style="color:#f1c21b">${colored}</span>`;
    } else if (/\b(INFO)\b/i.test(line)) {
      colored = colored.replace(/\b(INFO)\b/, '<span style="color:#42be65">$1</span>');
    } else if (/\b(DEBUG)\b/i.test(line)) {
      colored = `<span style="color:#525252">${colored}</span>`;
    }

    // HTTP status
    colored = colored
      .replace(/\b([45]\d{2})\b/g, '<span style="color:#fa4d56">$1</span>')
      .replace(/\b(200|201|204)\b/g, '<span style="color:#42be65">$1</span>')
      .replace(/\b(301|302|304)\b/g, '<span style="color:#f1c21b">$1</span>');

    return colored;
  }).join('\n');
}

export default function MonitoringLogsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  const showLogs = async (svcId: string) => {
    setLoading(true);
    setLogs('');
    try {
      const res = await fetch(`/api/v1/containers/${svcId}/logs?tail=500`);
      const data = await res.json();
      if (data.success && data.logs && data.logs.trim()) {
        setLogs(data.logs);
      } else if (svcId === 'polyon-mail') {
        setLogs('Stalwart Mail은 stdout 로그를 출력하지 않습니다.\n\n메일 서버 로그는 Stalwart Admin Console에서 확인할 수 있습니다.\n  → http://' + window.location.hostname + ':1113\n\nLive Tracing은 Enterprise 기능으로, 커뮤니티 에디션에서는 지원되지 않습니다.');
      } else {
        setLogs(data.error || '로그가 비어 있습니다.');
      }
    } catch (e: any) {
      setLogs(e.message);
    }
    setLoading(false);

    // Scroll to bottom
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    showLogs(LOG_SERVICES[0].id);
  }, []);

  const handleTabChange = ({ selectedIndex }: { selectedIndex: number }) => {
    setActiveIndex(selectedIndex);
    showLogs(LOG_SERVICES[selectedIndex].id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px 0' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px' }}>System Logs</h1>
        <p style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', margin: '0 0 8px' }}>PolyON 서비스 로그 조회</p>
      </div>

      {/* Tab Bar */}
      <Tabs selectedIndex={activeIndex} onChange={handleTabChange}>
        <TabList contained aria-label="서비스 로그 탭" style={{ paddingLeft: '32px' }}>
          {LOG_SERVICES.map(svc => (
            <Tab key={svc.id}>{svc.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      {/* Log Viewer */}
      <div style={{ flex: 1, margin: '0', padding: '0' }}>
        <div
          ref={logRef}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            lineHeight: '1.7',
            background: '#161616',
            color: '#c6c6c6',
            padding: '20px 24px',
            height: 'calc(100vh - 220px)',
            overflowY: 'auto',
            border: '1px solid #393939',
            borderTop: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
          dangerouslySetInnerHTML={{ __html: loading ? '로딩 중...' : formatLog(logs || '로그가 없습니다.') }}
        />
      </div>
    </div>
  );
}
