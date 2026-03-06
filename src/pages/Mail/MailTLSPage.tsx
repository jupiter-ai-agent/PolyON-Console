import { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Tag,
  InlineLoading,
  TextInput,
  TextArea,
  Tile,
  Toggle,
} from '@carbon/react';
import { Add, Edit, TrashCan, Renew, Certificate, Document, Password } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { mailApi, parseSettingsItems, extractErrorMessage } from '../../api/mail';
import { useToast } from '../../components/ToastNotification';

// ── 타입 ──────────────────────────────────────────────────────────────────

interface CertInfo {
  name: string;
  cert?: string;
  'private-key'?: string;
  default?: string | boolean;
}

function isFileRef(v?: string): boolean {
  return typeof v === 'string' && v.startsWith('%{file:') && v.endsWith('}%');
}
function extractFilePath(v: string): string {
  const m = v.match(/^%\{file:(.+)\}%$/);
  return m ? m[1] : v;
}

// ── 인증서 카드 ────────────────────────────────────────────────────────────

function CertCard({ cert, onEdit }: { cert: CertInfo; onEdit: (c: CertInfo) => void }) {
  const isDefault = cert.default === 'true' || cert.default === true;
  const certVal = cert.cert ?? '';
  const keyVal = cert['private-key'] ?? '';
  const certIsFile = isFileRef(certVal);
  const keyIsFile = isFileRef(keyVal);

  const renderSource = (val: string, isFile: boolean, label: string) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', color: 'var(--cds-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {isFile ? (
          <>
            <Tag type="blue">파일 참조</Tag>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--cds-text-secondary)' }}>{extractFilePath(val)}</span>
          </>
        ) : val ? (
          <Tag type="green">PEM 직접 입력</Tag>
        ) : (
          <span style={{ color: 'var(--cds-text-placeholder)', fontSize: 12 }}>미설정</span>
        )}
      </div>
    </div>
  );

  return (
    <Tile style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--cds-border-subtle-01)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--cds-border-subtle-01)' }}>
        <Certificate size={20} style={{ color: 'var(--cds-interactive)' }} />
        <span style={{ fontWeight: 600, fontSize: 15, fontFamily: 'monospace', flex: 1 }}>{cert.name}</span>
        {isDefault && <Tag type="green">기본</Tag>}
      </div>
      {renderSource(certVal, certIsFile, 'Certificate')}
      {renderSource(keyVal, keyIsFile, 'Private Key')}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 12 }}>
        <Button kind="ghost" renderIcon={Edit} onClick={() => onEdit(cert)}>
          편집
        </Button>
      </div>
    </Tile>
  );
}

// ── 편집 모달 ──────────────────────────────────────────────────────────────

function CertModal({
  open,
  editCert,
  allCerts,
  onClose,
  onSaved,
}: {
  open: boolean;
  editCert: CertInfo | null;
  allCerts: CertInfo[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editCert === null;
  const [name, setName] = useState('');
  const [certPem, setCertPem] = useState('');
  const [keyPem, setKeyPem] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isNew) {
      setName(''); setCertPem(''); setKeyPem(''); setIsDefault(false);
    } else if (editCert) {
      setName(editCert.name);
      setCertPem(isFileRef(editCert.cert ?? '') ? '' : (editCert.cert ?? ''));
      setKeyPem(isFileRef(editCert['private-key'] ?? '') ? '' : (editCert['private-key'] ?? ''));
      setIsDefault(editCert.default === 'true' || editCert.default === true);
    }
  }, [open, editCert, isNew]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('인증서 이름을 입력하세요.'); return; }
    if (!/^[a-zA-Z0-9\-_]+$/.test(name.trim())) { toast.error('이름은 영문·숫자·하이픈만 사용 가능합니다.'); return; }
    if (isNew && allCerts.some((c) => c.name === name.trim())) { toast.error(`'${name}' 이름의 인증서가 이미 존재합니다.`); return; }
    setSaving(true);
    try {
      const n = name.trim();
      if (certPem.trim()) await mailApi.updateSetting(`certificate.${n}.cert`, certPem.trim());
      if (keyPem.trim()) await mailApi.updateSetting(`certificate.${n}.private-key`, keyPem.trim());
      await mailApi.updateSetting(`certificate.${n}.default`, isDefault ? 'true' : 'false');
      toast.success(isNew ? '인증서가 추가되었습니다.' : '인증서가 저장되었습니다.');
      onSaved(); onClose();
    } catch (e) { toast.error('저장 실패: ' + extractErrorMessage(e)); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editCert) return;
    setDeleteConfirmOpen(false);
    setDeleting(true);
    try {
      await mailApi.deleteSetting(`certificate.${editCert.name}.cert`);
      await mailApi.deleteSetting(`certificate.${editCert.name}.private-key`);
      await mailApi.deleteSetting(`certificate.${editCert.name}.default`);
      toast.success('인증서가 삭제되었습니다.');
      onSaved(); onClose();
    } catch (e) { toast.error('삭제 실패: ' + extractErrorMessage(e)); }
    setDeleting(false);
  };

  return (
    <>
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={isNew ? '인증서 추가' : `인증서 편집 — ${editCert?.name ?? ''}`}
      primaryButtonText={saving ? '저장 중…' : '저장'}
      secondaryButtonText={!isNew ? '삭제' : '취소'}
      onRequestSubmit={handleSave}
      onSecondarySubmit={isNew ? onClose : () => setDeleteConfirmOpen(true)}
      primaryButtonDisabled={saving}
      danger={!isNew}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isNew && (
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>
              인증서 이름 <span style={{ color: 'var(--cds-support-error)' }}>*</span>
            </div>
            <TextInput
              id="cert-name"
              labelText=""
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: default, mail, backup"
              style={{ fontFamily: 'monospace' }}
            />
            <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>영문·숫자·하이픈만 사용 가능합니다.</p>
          </div>
        )}

        {/* Certificate PEM */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>Certificate (PEM)</div>
          {!isNew && isFileRef(editCert?.cert ?? '') && (
            <div style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Document size={16} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--cds-text-secondary)', flex: 1 }}>
                {extractFilePath(editCert?.cert ?? '')}
              </span>
              <Tag type="blue">파일 참조</Tag>
            </div>
          )}
          <TextArea
            id="cert-pem"
            labelText=""
            value={certPem}
            onChange={(e) => setCertPem(e.target.value)}
            placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: 11 }}
          />
          {!isNew && isFileRef(editCert?.cert ?? '') && (
            <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>
              새 PEM 내용을 입력하면 파일 참조를 대체합니다 (비워두면 유지).
            </p>
          )}
        </div>

        {/* Private Key PEM */}
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--cds-text-secondary)' }}>Private Key (PEM)</div>
          {!isNew && isFileRef(editCert?.['private-key'] ?? '') && (
            <div style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--cds-layer-02)', border: '1px solid var(--cds-border-subtle-00)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Password size={16} />
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--cds-text-secondary)', flex: 1 }}>
                {extractFilePath(editCert?.['private-key'] ?? '')}
              </span>
              <Tag type="blue">파일 참조</Tag>
            </div>
          )}
          <TextArea
            id="key-pem"
            labelText=""
            value={keyPem}
            onChange={(e) => setKeyPem(e.target.value)}
            placeholder={`-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`}
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: 11 }}
          />
          {!isNew && isFileRef(editCert?.['private-key'] ?? '') && (
            <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>
              새 PEM 내용을 입력하면 파일 참조를 대체합니다 (비워두면 유지).
            </p>
          )}
        </div>

        {/* Default toggle */}
        <div>
          <Toggle
            id="cert-default-toggle"
            labelText="기본 인증서"
            labelA="비활성화"
            labelB="활성화"
            toggled={isDefault}
            onToggle={(v) => setIsDefault(v)}
          />
          <p style={{ fontSize: 12, color: 'var(--cds-text-secondary)', marginTop: 4 }}>
            기본 인증서는 SNI 매칭이 없을 때 사용됩니다.
          </p>
        </div>
      </div>
    </Modal>

    {deleteConfirmOpen && (
      <Modal
        open={deleteConfirmOpen}
        onRequestClose={() => setDeleteConfirmOpen(false)}
        modalHeading="인증서 삭제"
        primaryButtonText={deleting ? '삭제 중…' : '삭제'}
        secondaryButtonText="취소"
        danger
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setDeleteConfirmOpen(false)}
        size="xs"
      >
        <p><strong>{editCert?.name}</strong> 인증서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
      </Modal>
    )}
    </>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export default function MailTLSPage() {
  const [certs, setCerts] = useState<CertInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCert, setEditCert] = useState<CertInfo | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await mailApi.getSettings('certificate');
      const entries = parseSettingsItems(r.data ?? {});
      const certMap: Record<string, CertInfo> = {};
      for (const [key, value] of entries) {
        const parts = key.split('.');
        if (parts.length < 3 || parts[0] !== 'certificate') continue;
        const certName = parts[1];
        const field = parts.slice(2).join('.');
        if (!certMap[certName]) certMap[certName] = { name: certName };
        (certMap[certName] as unknown as Record<string, string>)[field] = String(value);
      }
      setCerts(Object.values(certMap));
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditCert(null); setModalOpen(true); };
  const openEdit = (c: CertInfo) => { setEditCert(c); setModalOpen(true); };

  return (
    <>
      <PageHeader
        title="TLS 인증서 관리"
        description="메일 서버 TLS 인증서를 관리합니다."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Button renderIcon={Add} onClick={openAdd}>인증서 추가</Button>
        <Button kind="ghost" renderIcon={Renew} iconDescription="새로고침" hasIconOnly onClick={load} tooltipPosition="bottom" />
      </div>

      {loading ? (
        <InlineLoading description="인증서 로딩 중…" />
      ) : certs.length === 0 ? (
        <Tile style={{ textAlign: 'center', padding: 48 }}>
          <Certificate size={48} style={{ color: 'var(--cds-text-placeholder)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>인증서 없음</h3>
          <p style={{ color: 'var(--cds-text-secondary)' }}>아직 등록된 TLS 인증서가 없습니다.</p>
        </Tile>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {certs.map((c) => (
            <CertCard key={c.name} cert={c} onEdit={openEdit} />
          ))}
        </div>
      )}

      <CertModal
        open={modalOpen}
        editCert={editCert}
        allCerts={certs}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </>
  );
}
