import { useEffect, useState } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineLoading,
  Tile,
  CodeSnippet,
} from '@carbon/react';
import {
  Renew,
  Email,
  Globe,
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
  Document,
  Send,
  Group,
  Security,
} from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, fmtDate, parseSettingsItems, type LogItem } from '../../api/mail';

// ── 통계 카드 ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Tile style={{ minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cds-text-secondary)', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 300 }}>
        {loading ? <InlineLoading description="" style={{ display: 'inline-flex' }} /> : value}
      </div>
    </Tile>
  );
}

// ── Overview 탭 ────────────────────────────────────────────────────────────

interface OverviewStats {
  users: number | string;
  domains: number | string;
  pending: number | string;
  received: number | string;
  sent: number | string;
  status: 'online' | 'auth_error' | 'offline' | 'loading';
  version: string;
  logs: LogItem[];
  activityMap: Record<string, number>;
}

function OverviewTab() {
  const [stats, setStats] = useState<OverviewStats>({
    users: '—', domains: '—', pending: '—', received: '—', sent: '—',
    status: 'loading', version: '', logs: [], activityMap: {},
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    // Users (mail 속성 있는 AD 사용자)
    let users: string | number = '—';
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json() as { users?: { mail?: string }[] };
      users = (data.users ?? []).filter((u) => u.mail?.includes('@')).length;
    } catch { /* ignore */ }

    // Domains
    let domains: string | number = '—';
    try {
      const r = await mailApi.listPrincipals({ types: 'domain', limit: 1 });
      domains = r.data?.total ?? 0;
    } catch { /* ignore */ }

    // Server status
    let status: OverviewStats['status'] = 'offline';
    let version = '';
    try {
      const r = await mailApi.getVersion();
      status = 'online';
      version = `v${(r.data as { version?: string })?.version ?? ''}`;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 401 || e.status === 403) status = 'auth_error';
      else status = 'offline';
    }

    // Queue pending
    let pending: string | number = '—';
    try {
      const r = await mailApi.listQueue({ limit: 1 });
      pending = r.data?.total ?? 0;
    } catch { /* ignore */ }

    // Logs
    let logs: LogItem[] = [];
    let received: string | number = '—';
    let sent: string | number = '—';
    const activityMap: Record<string, number> = {};
    try {
      const r = await mailApi.listLogs({ limit: 200 });
      logs = r.data?.items ?? [];
      let rcvCount = 0;
      let sntCount = 0;
      for (const log of logs) {
        const eid = log.event_id ?? '';
        if (eid.includes('delivery.completed') || eid.includes('incoming')) rcvCount++;
        if (eid.includes('queue.completed') || eid.includes('smtp.delivery')) sntCount++;
        const evt = log.event ?? 'Unknown';
        activityMap[evt] = (activityMap[evt] ?? 0) + 1;
      }
      received = rcvCount;
      sent = sntCount;
    } catch { /* ignore */ }

    setStats({ users, domains, pending, received, sent, status, version, logs: logs.slice(0, 15), activityMap });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusNode = (() => {
    if (stats.status === 'loading') return <InlineLoading description="" />;
    if (stats.status === 'online') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckmarkFilled size={16} style={{ color: 'var(--cds-support-success)' }} /> 온라인</span>;
    if (stats.status === 'auth_error') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><WarningFilled size={16} style={{ color: 'var(--cds-support-warning)' }} /> 인증 오류</span>;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ErrorFilled size={16} style={{ color: 'var(--cds-support-error)' }} /> 오프라인</span>;
  })();

  const topEvents = Object.entries(stats.activityMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCount = topEvents.length ? topEvents[0][1] : 1;

  const logHeaders = [
    { key: 'timestamp', header: '시간' },
    { key: 'level', header: '레벨' },
    { key: 'event', header: '이벤트' },
    { key: 'details', header: '상세' },
  ];
  const logRows = stats.logs.map((log, i) => ({
    id: String(i),
    timestamp: fmtDate(log.timestamp),
    level: log.level ?? '—',
    event: log.event ?? '—',
    details: typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details ?? ''),
  }));

  return (
    <div>
      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="총 사용자" value={stats.users} icon={<Group size={16} />} loading={loading} />
        <StatCard label="총 도메인" value={stats.domains} icon={<Globe size={16} />} loading={loading} />
        <StatCard label="서버 상태" value={<>{statusNode}{stats.version && <div style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 2 }}>{stats.version}</div>}</>} icon={<Security size={16} />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="수신 메시지" value={stats.received} icon={<Email size={16} />} loading={loading} />
        <StatCard label="발신 메시지" value={stats.sent} icon={<Send size={16} />} loading={loading} />
        <StatCard label="큐 대기" value={stats.pending} icon={<Document size={16} />} loading={loading} />
      </div>

      {/* 활동 요약 */}
      {topEvents.length > 0 && (
        <Tile style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>최근 활동 요약</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {topEvents.map(([name, count]) => {
              const pct = Math.max(5, Math.round((count / maxCount) * 100));
              return (
                <div key={name} style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: 'var(--cds-text-secondary)', marginBottom: 4 }}>{name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 8, background: 'var(--cds-border-subtle-00)' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--cds-interactive)' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 24 }}>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Tile>
      )}

      {/* 최근 로그 */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>최근 활동</h3>
      <DataTable rows={logRows} headers={logHeaders} size="sm">
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--cds-text-secondary)' }}>로그가 없습니다</TableCell></TableRow>
              ) : rows.map((row) => (
                <TableRow {...getRowProps({ row })} key={row.id}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id} style={{ fontFamily: cell.info.header === 'details' || cell.info.header === 'event' ? 'var(--font-mono, monospace)' : undefined, fontSize: 12, maxWidth: cell.info.header === 'details' ? 400 : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: cell.info.header === 'timestamp' ? 'nowrap' : undefined }}>
                      {cell.info.header === 'level' ? (
                        <Tag type={cell.value === 'ERROR' ? 'red' : cell.value === 'WARN' ? 'purple' : 'blue'} size="sm">{cell.value}</Tag>
                      ) : String(cell.value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </div>
  );
}

// ── Network 탭 ─────────────────────────────────────────────────────────────

function NetworkTab() {
  const [listeners, setListeners] = useState<[string, string][]>([]);
  const [loadingListeners, setLoadingListeners] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await mailApi.getSettings('listener');
        const items = r.data?.items ?? {};
        const listenerMap: Record<string, Record<string, string>> = {};
        Object.entries(items).forEach(([k, v]) => {
          if (k === 'total') return;
          const parts = k.replace('listener.', '').split('.');
          const name = parts[0];
          const prop = parts.slice(1).join('.');
          if (!listenerMap[name]) listenerMap[name] = {};
          listenerMap[name][prop] = String(v);
        });
        setListeners(Object.entries(listenerMap).map(([name, props]) => [
          name,
          `${props['bind'] ?? '—'} | ${props['protocol'] ?? '—'} | ${props['tls.implicit'] === 'true' ? 'TLS' : 'Plain'}`,
        ]));
      } catch { /* ignore */ }
      setLoadingListeners(false);
    })();
  }, []);

  const protocolRows = [
    { id: '1', proto: 'SMTP', port: ':25', tls: 'STARTTLS', desc: '수신 메일' },
    { id: '2', proto: 'Submission', port: ':587', tls: 'STARTTLS', desc: '발신 메일' },
    { id: '3', proto: 'IMAPS', port: ':993', tls: 'Implicit TLS', desc: '메일 클라이언트 (암호화)' },
    { id: '4', proto: 'IMAP', port: ':143', tls: 'STARTTLS', desc: '메일 클라이언트' },
    { id: '5', proto: 'POP3S', port: ':995', tls: 'Implicit TLS', desc: 'POP3 암호화' },
    { id: '6', proto: 'POP3', port: ':110', tls: 'STARTTLS', desc: 'POP3' },
    { id: '7', proto: 'ManageSieve', port: ':4190', tls: 'STARTTLS', desc: '메일 필터 관리' },
    { id: '8', proto: 'HTTPS', port: ':443', tls: 'Implicit TLS', desc: '웹 인터페이스 / JMAP' },
    { id: '9', proto: 'HTTP', port: ':8080', tls: '—', desc: '관리 API / JMAP' },
  ];
  const protoHeaders = [
    { key: 'proto', header: '프로토콜' },
    { key: 'port', header: '포트' },
    { key: 'tls', header: 'TLS' },
    { key: 'desc', header: '설명' },
  ];

  return (
    <div>
      <Tile style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>리스너 구성</h3>
        {loadingListeners ? (
          <InlineLoading description="로딩 중…" />
        ) : listeners.length === 0 ? (
          <p style={{ color: 'var(--cds-text-placeholder)', fontSize: 13 }}>리스너 정보를 불러올 수 없습니다.</p>
        ) : listeners.map(([name, info]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
            <span style={{ fontWeight: 600, minWidth: 100 }}>{name}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{info}</span>
          </div>
        ))}
      </Tile>
      <Tile>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>프로토콜 포트</h3>
        <DataTable rows={protocolRows} headers={protoHeaders} size="sm">
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id} style={{ fontFamily: cell.info.header === 'port' ? 'monospace' : undefined, fontWeight: cell.info.header === 'proto' ? 600 : undefined }}>
                        {cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      </Tile>
    </div>
  );
}

// ── Security 탭 ────────────────────────────────────────────────────────────

function SecurityTab() {
  const [authEvents, setAuthEvents] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await mailApi.listLogs({ limit: 100 });
        setAuthEvents((r.data?.items ?? []).filter((l) => (l.event_id ?? '').includes('auth')).slice(0, 10));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const authFeatures = [
    { feature: 'DKIM 서명', status: '활성', type: 'green' as const, desc: '발신 메일 DKIM 서명 (Ed25519/RSA)' },
    { feature: 'DKIM 검증', status: '활성', type: 'green' as const, desc: '수신 메일 DKIM 서명 검증' },
    { feature: 'SPF 검증', status: '활성', type: 'green' as const, desc: '발신자 IP 검증' },
    { feature: 'DMARC 검증', status: '활성', type: 'green' as const, desc: 'DKIM+SPF 결합 정책 적용' },
    { feature: 'ARC 서명/검증', status: '활성', type: 'green' as const, desc: '전달 메일 인증 체인' },
    { feature: 'MTA-STS', status: '지원', type: 'blue' as const, desc: 'TLS 강제 정책 (DNS 설정 필요)' },
    { feature: 'DANE/TLSA', status: '지원', type: 'blue' as const, desc: 'DNS 기반 TLS 인증 (DNSSEC 필요)' },
  ];
  const secFeatures = [
    { feature: '스팸 필터', status: '활성', type: 'green' as const, desc: 'Sieve + Bayes classifier (내장)' },
    { feature: 'ACME TLS', status: '활성', type: 'green' as const, desc: "Let's Encrypt 자동 인증서" },
    { feature: 'Rate Limiting', status: '활성', type: 'green' as const, desc: '내장 속도 제한 및 Fail2Ban' },
    { feature: '암호화 at-rest', status: '지원', type: 'blue' as const, desc: '사용자별 저장소 암호화' },
    { feature: '2FA/TOTP', status: '지원', type: 'blue' as const, desc: '2단계 인증 (사용자 설정)' },
  ];

  const renderFeatureTable = (rows: typeof authFeatures) => (
    <Table size="sm">
      <TableHead>
        <TableRow>
          <TableHeader>기능</TableHeader>
          <TableHeader style={{ width: 80 }}>상태</TableHeader>
          <TableHeader>설명</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.feature}>
            <TableCell style={{ fontWeight: 500 }}>{r.feature}</TableCell>
            <TableCell><Tag type={r.type} size="sm">{r.status}</Tag></TableCell>
            <TableCell style={{ fontSize: 12 }}>{r.desc}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const authEvtHeaders = [
    { key: 'ts', header: '시간' },
    { key: 'result', header: '결과' },
    { key: 'details', header: '상세' },
  ];
  const authEvtRows = authEvents.map((l, i) => ({
    id: String(i),
    ts: fmtDate(l.timestamp),
    result: (l.event ?? '').includes('successful') ? '성공' : '실패',
    details: l.details ?? '',
    _success: (l.event ?? '').includes('successful'),
  }));

  return (
    <div>
      <Tile style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>인증 프로토콜</h3>
        {renderFeatureTable(authFeatures)}
      </Tile>
      <Tile style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>보안 기능</h3>
        {renderFeatureTable(secFeatures)}
      </Tile>
      <Tile>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>최근 인증 이벤트</h3>
        {loading ? <InlineLoading description="로딩 중…" /> : (
          authEvents.length === 0 ? (
            <p style={{ color: 'var(--cds-text-placeholder)', fontSize: 13 }}>최근 인증 이벤트 없음</p>
          ) : (
            <DataTable rows={authEvtRows} headers={authEvtHeaders} size="sm">
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>{headers.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id} style={{ fontSize: 12, fontFamily: cell.info.header === 'details' ? 'monospace' : undefined, whiteSpace: cell.info.header === 'ts' ? 'nowrap' : undefined }}>
                            {cell.info.header === 'result' ? (
                              <Tag type={(row as unknown as { _success: boolean })._success ? 'green' : 'red'} size="sm">{cell.value}</Tag>
                            ) : String(cell.value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )
        )}
      </Tile>
    </div>
  );
}

// ── Delivery 탭 ────────────────────────────────────────────────────────────

function DeliveryTab() {
  const [pending, setPending] = useState<number | string>('—');
  const [groups, setGroups] = useState<number | string>('—');
  const [lists, setLists] = useState<number | string>('—');
  const [deliveryEvents, setDeliveryEvents] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await mailApi.listQueue({ limit: 1 }); setPending(r.data?.total ?? 0); } catch { /* ignore */ }
      try { const r = await mailApi.listPrincipals({ types: 'group', limit: 1 }); setGroups(r.data?.total ?? 0); } catch { /* ignore */ }
      try { const r = await mailApi.listPrincipals({ types: 'list', limit: 1 }); setLists(r.data?.total ?? 0); } catch { /* ignore */ }
      try {
        const r = await mailApi.listLogs({ limit: 100 });
        setDeliveryEvents((r.data?.items ?? []).filter((l) => {
          const eid = l.event_id ?? '';
          return eid.includes('delivery') || eid.includes('queue') || eid.includes('smtp.');
        }).slice(0, 10));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const dnsRows = [
    { id: '1', type: 'MX', host: '@', value: 'mail.example.com' },
    { id: '2', type: 'A', host: 'mail', value: '(서버 IP)' },
    { id: '3', type: 'TXT (SPF)', host: '@', value: 'v=spf1 mx ~all' },
    { id: '4', type: 'TXT (DMARC)', host: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:postmaster@example.com' },
    { id: '5', type: 'TXT (DKIM)', host: 'default._domainkey', value: '도메인 관리에서 DKIM 키 생성 후 등록' },
    { id: '6', type: 'SRV (IMAP)', host: '_imaps._tcp', value: '0 1 993 mail.example.com' },
    { id: '7', type: 'SRV (Submission)', host: '_submission._tcp', value: '0 1 587 mail.example.com' },
  ];
  const dnsHeaders = [
    { key: 'type', header: '유형' },
    { key: 'host', header: '호스트' },
    { key: 'value', header: '값' },
  ];

  const evtHeaders = [
    { key: 'ts', header: '시간' },
    { key: 'level', header: '레벨' },
    { key: 'event', header: '이벤트' },
    { key: 'details', header: '상세' },
  ];
  const evtRows = deliveryEvents.map((l, i) => ({
    id: String(i),
    ts: fmtDate(l.timestamp),
    level: l.level ?? '—',
    event: l.event ?? '—',
    details: l.details ?? '',
  }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="큐 대기" value={pending} icon={<Document size={16} />} loading={loading} />
        <StatCard label="그룹" value={groups} icon={<Group size={16} />} loading={loading} />
        <StatCard label="메일링 리스트" value={lists} icon={<Email size={16} />} loading={loading} />
      </div>
      <Tile style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>DNS 레코드 체크리스트</h3>
        <DataTable rows={dnsRows} headers={dnsHeaders} size="sm">
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>{headers.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}</TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id} style={{ fontFamily: cell.info.header === 'value' ? 'monospace' : undefined, fontSize: 12, fontWeight: cell.info.header === 'type' ? 600 : undefined }}>
                        {cell.value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      </Tile>
      <Tile>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>최근 발송 이벤트</h3>
        {loading ? <InlineLoading description="로딩 중…" /> : (
          deliveryEvents.length === 0 ? (
            <p style={{ color: 'var(--cds-text-placeholder)', fontSize: 13 }}>최근 발송 이벤트 없음</p>
          ) : (
            <DataTable rows={evtRows} headers={evtHeaders} size="sm">
              {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>{headers.map((h) => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}</TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id} style={{ fontSize: 12, fontFamily: cell.info.header === 'event' || cell.info.header === 'details' ? 'monospace' : undefined, whiteSpace: cell.info.header === 'ts' ? 'nowrap' : undefined }}>
                            {cell.info.header === 'level' ? (
                              <Tag type={cell.value === 'ERROR' ? 'red' : cell.value === 'WARN' ? 'purple' : 'blue'} size="sm">{cell.value}</Tag>
                            ) : String(cell.value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTable>
          )
        )}
      </Tile>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailPage() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <PageHeader
        title="Mail Dashboard"
        description="Stalwart Mail Server — 메일, 캘린더, 연락처 통합 관리"
      />
      <div style={{ padding: '0 0 24px' }}>
        <Tabs selectedIndex={selectedTab} onChange={({ selectedIndex }) => setSelectedTab(selectedIndex)}>
          <TabList aria-label="Mail dashboard tabs">
            <Tab>Overview</Tab>
            <Tab>Network</Tab>
            <Tab>Security</Tab>
            <Tab>Delivery</Tab>
          </TabList>
          <TabPanels>
            <TabPanel><OverviewTab /></TabPanel>
            <TabPanel><NetworkTab /></TabPanel>
            <TabPanel><SecurityTab /></TabPanel>
            <TabPanel><DeliveryTab /></TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </>
  );
}
