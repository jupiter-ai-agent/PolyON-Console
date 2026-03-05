import { useEffect, useState, useRef } from 'react';

import {
  Button,
  TextInput,
  TextArea,
  Tag,
  Modal,
  InlineLoading,
  Tile,
  CodeSnippet,
} from '@carbon/react';
import { Checkmark, Close, Code, Launch, Download } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, parseSettingsItems, extractErrorMessage } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── 프리셋 템플릿 ──────────────────────────────────────────────────────────

interface SieveTemplate {
  id: string;
  title: string;
  desc: string;
  code: string;
}

const TEMPLATES: SieveTemplate[] = [
  {
    id: 'vacation',
    title: '자동 응답 (부재중)',
    desc: '지정 기간 동안 수신 메일에 자동으로 답장합니다.',
    code: `require ["vacation"];

# 부재중 자동 응답 (7일마다 한 번)
vacation
  :days 7
  :subject "부재중 안내"
  :from "me@example.com"
  "현재 부재중으로 메일을 확인하기 어렵습니다.

긴급한 경우 전화로 연락 주시기 바랍니다.
돌아오는 즉시 회신하겠습니다.";`,
  },
  {
    id: 'fileinto',
    title: '폴더 자동 이동',
    desc: '특정 발신자나 제목의 메일을 지정 폴더로 이동합니다.',
    code: `require ["fileinto"];

# 뉴스레터 → Newsletter 폴더로 이동
if header :contains "List-Unsubscribe" "" {
    fileinto "Newsletter";
    stop;
}

# 특정 발신자 → 지정 폴더로 이동
if address :is "from" "newsletter@example.com" {
    fileinto "Newsletter";
    stop;
}

# 제목에 특정 단어 포함 시 이동
if header :contains "subject" "[GitHub]" {
    fileinto "Development";
    stop;
}`,
  },
  {
    id: 'spam',
    title: '스팸 자동 처리',
    desc: '스팸 점수 헤더를 기반으로 메일을 Junk 폴더로 이동하거나 거부합니다.',
    code: `require ["fileinto", "reject"];

# X-Spam-Status 헤더 기반 스팸 처리
if header :contains "X-Spam-Status" "Yes" {
    fileinto "Junk";
    stop;
}

# 높은 스팸 점수 → 거부
if header :matches "X-Spam-Score" "*" {
    if header :value "ge" :comparator "i;ascii-numeric" "X-Spam-Score" "10" {
        reject "메시지가 스팸으로 판단되어 거부되었습니다.";
        stop;
    }
}`,
  },
  {
    id: 'attachment',
    title: '첨부파일 크기 제한',
    desc: '대용량 첨부파일이 포함된 메일을 거부합니다.',
    code: `require ["reject", "fileinto"];

# 첨부파일 크기 제한 (10MB 이상 거부)
if size :over 10M {
    reject "첨부파일이 너무 큽니다 (최대 10MB). 파일 공유 서비스를 이용해 주세요.";
    stop;
}

# 위험한 실행 파일 첨부 차단
if header :matches "Content-Type" "*application/x-msdownload*" {
    reject "보안상 .exe 파일 첨부는 허용되지 않습니다.";
    stop;
}`,
  },
];

// ── 탬플릿 카드 ────────────────────────────────────────────────────────────

function TemplateCard({ template, onPreview }: { template: SieveTemplate; onPreview: (t: SieveTemplate) => void }) {
  return (
    <Tile
      style={{ cursor: 'pointer', borderLeft: '4px solid var(--cds-interactive)' }}
      onClick={() => onPreview(template)}
    >
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{template.title}</h4>
      <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginBottom: 12 }}>{template.desc}</p>
      <Button kind="ghost" size="sm" renderIcon={Code} onClick={(e) => { e.stopPropagation(); onPreview(template); }}>
        코드 보기
      </Button>
    </Tile>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailSievePage() {
  const toast = useToast();
  const [globalScriptName, setGlobalScriptName] = useState('');
  const [sieveStatus, setSieveStatus] = useState<'loading' | 'active' | 'inactive'>('loading');
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [editorScriptName, setEditorScriptName] = useState('main');
  const [editorCode, setEditorCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);

  const [previewTemplate, setPreviewTemplate] = useState<SieveTemplate | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SieveTemplate | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 글로벌 설정 로드
  useEffect(() => {
    (async () => {
      try {
        const r = await mailApi.getSettings('session.data');
        const entries = parseSettingsItems(r.data ?? {});
        const entry = entries.find(([k]) => k === 'session.data.script');
        setGlobalScriptName(entry ? entry[1] : '');
      } catch { /* ignore */ }

      // ManageSieve 상태
      try {
        const r = await mailApi.getSettings('listener');
        const entries = parseSettingsItems(r.data ?? {});
        const hasManageSieve = entries.some(([k, v]) =>
          String(v).toLowerCase().includes('managesieve') ||
          String(v).toLowerCase() === 'sieve' ||
          String(v) === '4190'
        );
        setSieveStatus(hasManageSieve ? 'active' : 'inactive');
      } catch { setSieveStatus('inactive'); }

      setSettingsLoading(false);
    })();
  }, []);

  const saveGlobalScriptName = async () => {
    setSavingName(true);
    try {
      if (globalScriptName.trim()) {
        await mailApi.updateSetting('session.data.script', globalScriptName.trim());
      } else {
        await mailApi.deleteSetting('session.data.script');
      }
    } catch { /* ignore */ }
    setSavingName(false);
  };

  const clearGlobalScript = async () => {
    setClearConfirmOpen(false);
    setGlobalScriptName('');
    setSavingName(true);
    try {
      await mailApi.deleteSetting('session.data.script');
      toast.success('글로벌 Sieve 스크립트가 해제되었습니다.');
    } catch (e) { toast.error('실패: ' + extractErrorMessage(e)); }
    setSavingName(false);
  };

  const applyScript = async () => {
    const name = editorScriptName.trim();
    const code = editorCode.trim();
    if (!name) { toast.error('스크립트 이름을 입력하세요.'); return; }
    if (!code) { toast.error('스크립트 내용을 입력하세요.'); return; }
    setSaving(true);
    try {
      await mailApi.updateSetting(`eval.script.${name}`, code);
      await mailApi.updateSetting('session.data.script', name);
      setGlobalScriptName(name);
      toast.success('스크립트가 적용되었습니다.');
    } catch (e) { toast.error('적용 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  const loadCurrentScript = async () => {
    const name = editorScriptName.trim() || globalScriptName;
    if (!name) { toast.error('불러올 스크립트 이름을 먼저 입력하세요.'); return; }
    setLoadingScript(true);
    try {
      const r = await mailApi.getSettings(`eval.script.${name}`);
      const entries = parseSettingsItems(r.data ?? {});
      const entry = entries.find(([k]) => k === `eval.script.${name}`);
      if (entry) {
        setEditorCode(entry[1]);
        setEditorScriptName(name);
        toast.success('스크립트를 불러왔습니다.');
      } else {
        toast.info('스크립트를 찾을 수 없습니다.');
      }
    } catch (e) { toast.error('불러오기 실패: ' + extractErrorMessage(e)); }
    setLoadingScript(false);
  };

  const useTemplate = (t: SieveTemplate) => {
    if (editorCode.trim()) {
      setPendingTemplate(t);
      setOverwriteConfirmOpen(true);
      return;
    }
    applyTemplate(t);
  };

  const applyTemplate = (t: SieveTemplate) => {
    setEditorCode(t.code);
    setEditorScriptName(t.id);
    setPreviewTemplate(null);
    setPendingTemplate(null);
    setTimeout(() => editorRef.current?.focus(), 100);
  };

  const copyTemplate = async (t: SieveTemplate) => {
    try { await navigator.clipboard.writeText(t.code); } catch { /* ignore */ }
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 4;
      setEditorCode(ta.value);
    }
  };

  return (
    <>
      <PageHeader title="Sieve 필터 규칙" description="서버 측 메일 필터링 규칙을 관리합니다." />

      {/* 글로벌 Sieve 설정 */}
      <section style={{ marginBottom: 24 }}>
        <Tile>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>글로벌 Sieve 설정</h3>
          <p style={{ fontSize: 13, color: 'var(--cds-text-secondary)', marginBottom: 16 }}>
            서버 전체에 적용되는 수신 처리 스크립트를 지정합니다.{' '}
            <code style={{ background: 'var(--cds-layer-02)', padding: '1px 6px', fontSize: 11 }}>
              session.data.script
            </code>
          </p>

          {settingsLoading ? (
            <InlineLoading description="로딩 중…" />
          ) : (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
                  수신 시 실행 스크립트 이름
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TextInput
                    id="global-script-name"
                    labelText=""
                    value={globalScriptName}
                    onChange={(e) => setGlobalScriptName(e.target.value)}
                    placeholder="예: default, main"
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                  />
                  <Button size="sm" renderIcon={Checkmark} onClick={saveGlobalScriptName} disabled={savingName}>
                    적용
                  </Button>
                  <Button kind="ghost" size="sm" renderIcon={Close} onClick={() => setClearConfirmOpen(true)} disabled={savingName}>
                    해제
                  </Button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>
                  비워두면 서버 전체 Sieve 스크립트가 비활성화됩니다.
                </p>
              </div>
              <div style={{ minWidth: 180 }}>
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
                  ManageSieve 상태 (포트 4190)
                </div>
                {sieveStatus === 'loading' ? (
                  <InlineLoading description="" />
                ) : (
                  <Tag type={sieveStatus === 'active' ? 'green' : 'gray'} size="sm">
                    {sieveStatus === 'active' ? '활성화 (포트 4190)' : '설정 미확인'}
                  </Tag>
                )}
              </div>
            </div>
          )}
        </Tile>
      </section>

      {/* 프리셋 템플릿 */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>
          프리셋 규칙 템플릿
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} onPreview={setPreviewTemplate} />
          ))}
        </div>
      </section>

      {/* 커스텀 스크립트 에디터 */}
      <section>
        <Tile>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>커스텀 Sieve 스크립트</h3>
            <a
              href="https://datatracker.ietf.org/doc/html/rfc5228"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--cds-link-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Launch size={14} /> RFC 5228 문법 참고
            </a>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
              스크립트 이름{' '}
              <span style={{ fontWeight: 400, color: 'var(--cds-text-secondary)' }}>
                (eval.script.&lt;이름&gt; 형태로 저장)
              </span>
            </div>
            <TextInput
              id="editor-script-name"
              labelText=""
              value={editorScriptName}
              onChange={(e) => setEditorScriptName(e.target.value)}
              placeholder="예: main, custom"
              style={{ maxWidth: 300, fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>Sieve 스크립트</div>
            <TextArea
              id="sieve-editor-code"
              labelText=""
              ref={editorRef}
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              onKeyDown={handleTabKey}
              rows={16}
              placeholder={`require ["fileinto", "reject", "vacation"];\n\n# 스팸 자동 이동\nif header :contains "X-Spam-Status" "Yes" {\n    fileinto "Junk";\n}\n\n# 특정 주소 → 폴더 이동\nif address :is "from" "newsletter@example.com" {\n    fileinto "Newsletter";\n    stop;\n}`}
              style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button size="sm" renderIcon={Checkmark} onClick={applyScript} disabled={saving}>
              {saving ? '저장 중…' : '글로벌 스크립트로 저장'}
            </Button>
            <Button kind="ghost" renderIcon={Download} onClick={loadCurrentScript} disabled={loadingScript}>
              {loadingScript ? '불러오는 중…' : '현재 설정 불러오기'}
            </Button>
            <Button kind="ghost" renderIcon={Close} onClick={() => setEditorCode('')}>
              지우기
            </Button>
          </div>
        </Tile>
      </section>

      {/* 프리셋 미리보기 모달 */}
      <Modal
        open={previewTemplate !== null}
        onRequestClose={() => setPreviewTemplate(null)}
        modalHeading={previewTemplate?.title ?? ''}
        primaryButtonText="에디터에 붙여넣기"
        secondaryButtonText="복사"
        onRequestSubmit={() => previewTemplate && useTemplate(previewTemplate)}
        onSecondarySubmit={() => previewTemplate && copyTemplate(previewTemplate)}
        size="lg"
      >
        {previewTemplate && (
          <div>
            <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--cds-text-secondary)' }}>
              {previewTemplate.desc}
            </p>
            <pre style={{
              background: 'var(--cds-layer-02)',
              padding: 20,
              fontSize: 12,
              fontFamily: 'monospace',
              lineHeight: 1.6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}>
              {previewTemplate.code}
            </pre>
          </div>
        )}
      </Modal>

      <Modal
        open={clearConfirmOpen}
        onRequestClose={() => setClearConfirmOpen(false)}
        modalHeading="글로벌 스크립트 해제"
        primaryButtonText="해제"
        secondaryButtonText="취소"
        danger
        onRequestSubmit={clearGlobalScript}
        onSecondarySubmit={() => setClearConfirmOpen(false)}
        size="xs"
      >
        <p>글로벌 Sieve 스크립트 설정을 해제하시겠습니까?</p>
      </Modal>

      <Modal
        open={overwriteConfirmOpen}
        onRequestClose={() => setOverwriteConfirmOpen(false)}
        modalHeading="에디터 내용 덮어쓰기"
        primaryButtonText="덮어쓰기"
        secondaryButtonText="취소"
        danger
        onRequestSubmit={() => { setOverwriteConfirmOpen(false); if (pendingTemplate) applyTemplate(pendingTemplate); }}
        onSecondarySubmit={() => { setOverwriteConfirmOpen(false); setPendingTemplate(null); }}
        size="xs"
      >
        <p>에디터의 현재 내용을 삭제하고 템플릿으로 덮어씌우시겠습니까?</p>
      </Modal>
    </>
  );
}
