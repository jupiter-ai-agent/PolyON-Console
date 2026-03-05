
import { useState, useRef } from 'react';
import {
  Button,
  RadioButtonGroup,
  RadioButton,
  TextArea,
  InlineLoading,
  Tag,
  Tile,
} from '@carbon/react';
import { Upload, CheckmarkFilled, WarningFilled } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi } from '../../api/mail';

export default function MailSpamUploadPage() {
  const [messageType, setMessageType] = useState<'spam' | 'ham'>('spam');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMessage((ev.target?.result as string) ?? '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setResult({ success: false, message: 'RFC 5322 메시지를 입력하세요.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      await mailApi.trainSpam(messageType, trimmed);
      setResult({
        success: true,
        message: `${messageType === 'spam' ? '스팸' : '정상(햄)'} 샘플이 학습되었습니다.`,
      });
      setMessage('');
    } catch (e) {
      setResult({ success: false, message: '학습 실패: ' + (e as Error).message });
    }
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        title="스팸/햄 샘플 업로드"
        description="Stalwart 스팸 필터에 학습 샘플을 제출합니다. RFC 5322 형식의 원시 이메일 메시지를 사용하세요."
      />

      <Tile style={{ maxWidth: 800, marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 유형 선택 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--cds-text-primary)' }}>메시지 유형</p>
            <RadioButtonGroup
              name="spam-type"
              valueSelected={messageType}
              onChange={(val) => setMessageType(val as 'spam' | 'ham')}
              orientation="horizontal"
            >
              <RadioButton
                id="type-spam"
                labelText="스팸 (Spam)"
                value="spam"
              />
              <RadioButton
                id="type-ham"
                labelText="정상 (Ham)"
                value="ham"
              />
            </RadioButtonGroup>
          </div>

          {/* 파일 업로드 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--cds-text-primary)' }}>
              파일에서 불러오기
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".eml,.txt,message/rfc822"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={Upload}
              onClick={() => fileRef.current?.click()}
            >
              .eml 파일 선택
            </Button>
            {message && (
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--cds-text-secondary)' }}>
                {message.split('\n').length}줄 로드됨
              </span>
            )}
          </div>

          {/* 텍스트 직접 입력 */}
          <TextArea
            id="spam-message"
            labelText="RFC 5322 메시지 직접 입력"
            placeholder={`From: sender@example.com\nTo: recipient@example.com\nSubject: Test Message\nDate: Fri, 27 Feb 2026 00:00:00 +0900\nMessage-ID: <test@example.com>\n\n메시지 본문`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />

          {/* 결과 표시 */}
          {result && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: result.success ? 'var(--cds-support-success-background, #defbe6)' : 'var(--cds-support-error-background, #fff1f1)', borderRadius: 4 }}>
              {result.success ? (
                <CheckmarkFilled size={20} style={{ color: 'var(--cds-support-success)' }} />
              ) : (
                <WarningFilled size={20} style={{ color: 'var(--cds-support-error)' }} />
              )}
              <span style={{ fontSize: 13 }}>{result.message}</span>
            </div>
          )}

          {/* 제출 버튼 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              kind={messageType === 'spam' ? 'danger' : 'primary'}
              onClick={handleSubmit}
              disabled={loading || !message.trim()}
              renderIcon={loading ? InlineLoading : Upload}
            >
              {loading ? '학습 중…' : `${messageType === 'spam' ? '스팸' : '정상(햄)'} 샘플 제출`}
            </Button>
            {message && (
              <Button kind="ghost" onClick={() => setMessage('')}>지우기</Button>
            )}
          </div>

          {/* 안내 */}
          <div style={{ background: 'var(--cds-layer-02)', padding: '12px 16px', borderRadius: 4, fontSize: 12, color: 'var(--cds-text-secondary)' }}>
            <strong>안내:</strong> RFC 5322 형식의 완전한 이메일 메시지(헤더 포함)를 제출해야 합니다.
            Received 헤더, DKIM 서명, SPF 정보가 포함된 원시 메시지일수록 학습 효과가 높습니다.
          </div>
        </div>
      </Tile>
    </>
  );
}
