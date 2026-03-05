import { useState } from 'react';
import {
  Button,
  Tag,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TextInput,
  TextArea,
  Tile,
} from '@carbon/react';
import { Play, Reset } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, type SpamClassifyResult } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

export default function MailSpamTestPage() {
  const toast = useToast();
  const [remoteIp, setRemoteIp] = useState('127.0.0.1');
  const [ehloDomain, setEhloDomain] = useState('');
  const [envFrom, setEnvFrom] = useState('');
  const [rcptTo, setRcptTo] = useState(['']);
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SpamClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addRcpt = () => setRcptTo((prev) => [...prev, '']);
  const removeRcpt = (i: number) => setRcptTo((prev) => prev.filter((_, idx) => idx !== i));
  const setRcpt = (i: number, v: string) => setRcptTo((prev) => { const n = [...prev]; n[i] = v; return n; });

  const runTest = async () => {
    if (!message.trim()) { toast.error('메시지를 입력하세요.'); return; }
    setTesting(true);
    setError(null);
    setResult(null);
    try {
      const r = await mailApi.spamClassify({
        message,
        remote_ip: remoteIp || '127.0.0.1',
        ehlo_domain: ehloDomain,
        authenticated_as: null,
        is_tls: true,
        env_from: envFrom,
        env_from_flags: 0,
        env_rcpt_to: rcptTo.filter(Boolean),
      });
      setResult(r.data ?? null);
    } catch (e: unknown) { setError((e as Error).message); }
    setTesting(false);
  };

  const clear = () => { setResult(null); setError(null); setMessage(''); };

  // 결과 파싱
  const score = result?.score ?? 0;
  const disposition = result?.disposition ?? {};
  const dispKey = Object.keys(disposition)[0] ?? 'unknown';
  const isSpam = dispKey === 'allow' && typeof (disposition[dispKey] as { value?: string })?.value === 'string' &&
    ((disposition[dispKey] as { value?: string }).value ?? '').includes('Yes');
  const isReject = dispKey === 'reject';
  const isDiscard = dispKey === 'discard';
  const isBad = isSpam || isReject || isDiscard;
  const label = isReject ? '거부' : isDiscard ? '폐기' : isSpam ? '스팸' : '정상';

  const tagRows = Object.entries(result?.tags ?? {}).map(([tagName, scoreObj]) => {
    const key = Object.keys(scoreObj as object)[0] ?? '';
    let val = '';
    if (key === 'allow') val = ((scoreObj as Record<string, { value?: number }>).allow?.value ?? 0).toFixed(2);
    else if (key === 'discard') val = 'DISCARD';
    else if (key === 'reject') val = 'REJECT';
    return { name: tagName, value: val };
  });

  return (
    <>
      <PageHeader title="스팸 필터 테스트" description="메시지를 입력하여 스팸 분류 결과를 확인합니다." />

      <div style={{ maxWidth: 720 }}>
        {/* 세션 정보 */}
        <Tile style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>세션 정보</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <TextInput
                id="spam-remote-ip"
                labelText="원격 IP"
                value={remoteIp}
                onChange={(e) => setRemoteIp(e.target.value)}
                placeholder="0.0.0.0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <TextInput
                id="spam-ehlo-domain"
                labelText="EHLO 도메인"
                value={ehloDomain}
                onChange={(e) => setEhloDomain(e.target.value)}
                placeholder="mail.example.com"
              />
            </div>
          </div>
        </Tile>

        {/* 봉투 */}
        <Tile style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>봉투 (Envelope)</h3>
          <div style={{ marginBottom: 12 }}>
            <TextInput
              id="spam-env-from"
              labelText="발신자 (MAIL FROM)"
              value={envFrom}
              onChange={(e) => setEnvFrom(e.target.value)}
              placeholder="sender@example.com"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>수신자 (RCPT TO)</div>
            {rcptTo.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <TextInput
                  id={`spam-rcpt-${i}`}
                  labelText=""
                  value={r}
                  onChange={(e) => setRcpt(i, e.target.value)}
                  placeholder="recipient@example.com"
                  style={{ flex: 1 }}
                />
                <Button kind="danger--ghost" size="sm" onClick={() => removeRcpt(i)} disabled={rcptTo.length === 1}>삭제</Button>
              </div>
            ))}
            <Button kind="ghost" size="sm" onClick={addRcpt}>+ 수신자 추가</Button>
          </div>
        </Tile>

        {/* 메시지 본문 */}
        <Tile style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>메시지 본문</h3>
          <TextArea
            id="spam-message"
            labelText="메시지 (RFC 5322 형식 또는 본문)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={`From: sender@example.com\nTo: recipient@example.com\nSubject: Test\n\nThis is a test message.`}
          />
        </Tile>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <Button size="sm" renderIcon={Play} onClick={runTest} disabled={testing}>
            {testing ? '분석 중…' : '테스트 실행'}
          </Button>
          <Button kind="ghost" renderIcon={Reset} onClick={clear}>초기화</Button>
        </div>

        {/* 에러 */}
        {error && (
          <Tile style={{ borderLeft: '4px solid var(--cds-support-error)', marginBottom: 16 }}>
            <p style={{ color: 'var(--cds-support-error)', fontSize: 13 }}>{error}</p>
          </Tile>
        )}

        {/* 결과 */}
        {result && (
          <Tile style={{ borderLeft: `4px solid ${isBad ? 'var(--cds-support-error)' : 'var(--cds-support-success)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: isBad ? 'var(--cds-support-error)' : 'var(--cds-support-success)' }}>
                {score.toFixed(2)}
              </span>
              <Tag type={isBad ? 'red' : 'green'} size="md">{label}</Tag>
            </div>
            {tagRows.length > 0 && (
              <>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)', letterSpacing: '0.32px', textTransform: 'uppercase', marginBottom: 8 }}>
                  태그 상세
                </h4>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>규칙</TableHeader>
                      <TableHeader style={{ textAlign: 'right' }}>점수</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tagRows.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.name}</TableCell>
                        <TableCell style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{t.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Tile>
        )}
      </div>
    </>
  );
}
