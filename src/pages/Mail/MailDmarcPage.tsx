
import { useState } from 'react';
import {
  Button,
  TextInput,
  TextArea,
  InlineLoading,
  Tile,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
} from '@carbon/react';
import { Search, CheckmarkFilled, WarningFilled, ErrorFilled, Help } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, type DmarcTroubleshootResult } from '../../api/mail';

// ── 결과 카드 ─────────────────────────────────────────────────────────────

function ResultCard({
  title,
  pass,
  details,
}: {
  title: string;
  pass?: boolean;
  details?: string;
}) {
  return (
    <Tile style={{ flex: '1 1 180px', minWidth: 160 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {pass === true ? (
            <CheckmarkFilled size={24} style={{ color: 'var(--cds-support-success)' }} />
          ) : pass === false ? (
            <ErrorFilled size={24} style={{ color: 'var(--cds-support-error)' }} />
          ) : (
            <Help size={24} style={{ color: 'var(--cds-text-secondary)' }} />
          )}
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            {pass === true ? 'Pass' : pass === false ? 'Fail' : 'N/A'}
          </span>
        </div>
        {details && (
          <p style={{ fontSize: 11, color: 'var(--cds-text-secondary)', margin: 0, wordBreak: 'break-all' }}>
            {details}
          </p>
        )}
      </div>
    </Tile>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailDmarcPage() {
  const [mailFrom, setMailFrom] = useState('');
  const [ehlo, setEhlo] = useState('');
  const [ip, setIp] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DmarcTroubleshootResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!mailFrom.trim() || !ehlo.trim() || !ip.trim()) {
      setError('발신자 주소, EHLO 호스트, IP 주소는 필수입니다.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r = await mailApi.troubleshootDmarc({
        mailFrom: mailFrom.trim(),
        ehloDomain: ehlo.trim(),
        remoteIp: ip.trim(),
        body: body.trim() || null,
      });
      setResult(r.data ?? null);
    } catch (e) {
      setError('분석 실패: ' + (e as Error).message);
    }
    setLoading(false);
  };

  const dkimResults: unknown[] = result?.dkimResults ?? [];

  return (
    <>
      <PageHeader title="DMARC 트러블슈팅" description="DMARC · DKIM · SPF · ARC 인증 결과를 시뮬레이션합니다" />

      {/* 입력 폼 */}
      <Tile style={{ maxWidth: 700, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TextInput
              id="dmarc-mail-from"
              labelText="발신자 주소 (MAIL FROM) *"
              value={mailFrom}
              onChange={(e) => setMailFrom(e.target.value)}
              placeholder="sender@example.com"
            />
            <TextInput
              id="dmarc-ehlo"
              labelText="EHLO 호스트명 *"
              value={ehlo}
              onChange={(e) => setEhlo(e.target.value)}
              placeholder="mail.example.com"
            />
            <TextInput
              id="dmarc-ip"
              labelText="원격 IP 주소 *"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="203.0.113.1"
            />
          </div>
          <TextArea
            id="dmarc-body"
            labelText="메시지 본문 (선택 — DKIM 검증용)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="From: sender@example.com&#10;DKIM-Signature: ...&#10;&#10;메시지 본문"
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cds-support-error)', fontSize: 13 }}>
              <WarningFilled size={16} /> {error}
            </div>
          )}

          <Button renderIcon={loading ? InlineLoading : Search} onClick={handleSubmit} disabled={loading}>
            {loading ? '분석 중…' : 'DMARC 분석 실행'}
          </Button>
        </div>
      </Tile>

      {/* 결과 */}
      {result && (
        <>
          {/* 요약 카드 */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <ResultCard
              title="DMARC"
              pass={result.dmarcPass}
              details={result.dmarcPolicy ? JSON.stringify(result.dmarcPolicy).slice(0, 80) : undefined}
            />
            <ResultCard
              title="DKIM"
              pass={result.dkimPass}
              details={dkimResults.length > 0 ? `${dkimResults.length}개 서명` : '서명 없음'}
            />
            <ResultCard
              title="SPF (EHLO)"
              pass={result.spfEhloResult ? String(result.spfEhloResult) === 'pass' : undefined}
              details={result.spfEhloDomain}
            />
            <ResultCard
              title="SPF (MAIL FROM)"
              pass={result.spfMailFromResult ? String(result.spfMailFromResult) === 'pass' : undefined}
              details={result.spfMailFromDomain}
            />
            <ResultCard
              title="ARC"
              pass={result.arcResult ? String(result.arcResult) !== 'fail' : undefined}
              details={result.arcResult ? String(result.arcResult) : undefined}
            />
          </div>

          {/* 상세 테이블 */}
          <Table size="sm">
            <TableHead>
              <TableRow>
                <TableHeader style={{ width: 160 }}>항목</TableHeader>
                <TableHeader style={{ width: 100 }}>결과</TableHeader>
                <TableHeader>상세</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell style={{ fontWeight: 600 }}>DMARC 정책</TableCell>
                <TableCell>
                  <Tag type={result.dmarcPass ? 'green' : 'red'} size="sm">
                    {result.dmarcPass ? 'pass' : 'fail'}
                  </Tag>
                </TableCell>
                <TableCell style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {result.dmarcResult ? JSON.stringify(result.dmarcResult) : '—'}
                </TableCell>
              </TableRow>
              {dkimResults.map((dk, i) => (
                <TableRow key={i}>
                  <TableCell style={{ fontWeight: 600 }}>DKIM #{i + 1}</TableCell>
                  <TableCell>
                    <Tag type={String(dk).includes('pass') ? 'green' : 'red'} size="sm">
                      {typeof dk === 'object' ? (dk as Record<string, string>).result ?? 'N/A' : String(dk)}
                    </Tag>
                  </TableCell>
                  <TableCell style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {typeof dk === 'object' ? JSON.stringify(dk) : String(dk)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell style={{ fontWeight: 600 }}>SPF (EHLO)</TableCell>
                <TableCell>
                  <Tag type={String(result.spfEhloResult) === 'pass' ? 'green' : 'red'} size="sm">
                    {String(result.spfEhloResult ?? 'N/A')}
                  </Tag>
                </TableCell>
                <TableCell style={{ fontSize: 12 }}>{result.spfEhloDomain ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600 }}>SPF (MAIL FROM)</TableCell>
                <TableCell>
                  <Tag type={String(result.spfMailFromResult) === 'pass' ? 'green' : 'red'} size="sm">
                    {String(result.spfMailFromResult ?? 'N/A')}
                  </Tag>
                </TableCell>
                <TableCell style={{ fontSize: 12 }}>{result.spfMailFromDomain ?? '—'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600 }}>IP 역방향 DNS</TableCell>
                <TableCell>
                  <Tag type={result.ipRevResult ? 'green' : 'gray'} size="sm">
                    {result.ipRevResult ? String(result.ipRevResult) : 'N/A'}
                  </Tag>
                </TableCell>
                <TableCell style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {(result.ipRevPtr ?? []).join(', ') || '—'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={{ fontWeight: 600 }}>ARC</TableCell>
                <TableCell>
                  <Tag type={result.arcResult && String(result.arcResult) !== 'fail' ? 'green' : 'gray'} size="sm">
                    {String(result.arcResult ?? 'N/A')}
                  </Tag>
                </TableCell>
                <TableCell style={{ fontSize: 12 }}>
                  {result.elapsed ? `처리 시간: ${result.elapsed}ms` : '—'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}
