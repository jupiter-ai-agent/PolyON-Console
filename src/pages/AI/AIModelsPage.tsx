// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import {
  Button, DataTable, Table, TableHead, TableRow, TableHeader,
  TableBody, TableCell, Tag, Modal, TextInput, Select, SelectItem,
  InlineNotification, InlineLoading, OverflowMenu, OverflowMenuItem,
} from '@carbon/react';
import { Add, Renew, TrashCan } from '@carbon/icons-react';
import { aiApi } from '../../api/ai';
import type { ModelInfo } from '../../api/ai';

const PROVIDERS = [
  { value: 'openai',     label: 'OpenAI',     color: '#10a37f' },
  { value: 'anthropic',  label: 'Anthropic',  color: '#c97d4e' },
  { value: 'gemini',     label: 'Google',     color: '#4285f4' },
  { value: 'ollama',     label: 'Ollama (내부)', color: '#888' },
  { value: 'custom',     label: 'Custom',     color: '#6929c4' },
];

const PRESETS: Record<string, string[]> = {
  openai:    ['openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/text-embedding-3-small', 'openai/text-embedding-3-large'],
  anthropic: ['anthropic/claude-opus-4-6', 'anthropic/claude-sonnet-4-6', 'anthropic/claude-haiku-3-5'],
  gemini:    ['gemini/gemini-2.5-pro-preview', 'gemini/gemini-2.0-flash'],
  ollama:    ['ollama/llama3.2', 'ollama/mistral', 'ollama/nomic-embed-text'],
  custom:    [],
};

function providerOf(model: string) {
  const p = PROVIDERS.find(p => model.startsWith(p.value + '/'));
  return p || { value: 'custom', label: 'Custom', color: '#6929c4' };
}

function shortId(model: string) {
  return model.includes('/') ? model.split('/').slice(1).join('/') : model;
}

export default function AIModelsPage() {
  const [models, setModels]       = useState<ModelInfo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [provider, setProvider]   = useState('openai');
  const [preset, setPreset]       = useState('');
  const [modelId, setModelId]     = useState('');
  const [apiKey, setApiKey]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.getModelsInfo();
      setModels(res?.data || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`모델 "${name}"을 삭제하시겠습니까?`)) return;
    try {
      await aiApi.deleteModel(id);
      load();
    } catch (e: any) {
      alert('삭제 실패: ' + (e?.message || String(e)));
    }
  };

  const handleAdd = async () => {
    if (!modelId.trim()) return;
    setSaving(true);
    setSaveErr('');
    try {
      await aiApi.registerModel(
        shortId(modelId.trim()),
        modelId.trim(),
        apiKey.trim() || undefined,
      );
      setShowAdd(false);
      setModelId(''); setPreset(''); setApiKey('');
      load();
    } catch (e: any) {
      setSaveErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const headers = [
    { key: 'name',     header: '모델 이름' },
    { key: 'provider', header: '프로바이더' },
    { key: 'actual',   header: 'Actual Model ID' },
    { key: 'actions',  header: '' },
  ];

  const rows = models.map((m, i) => {
    const actual = m.litellm_params?.model || '';
    const prov = providerOf(actual);
    return {
      id: m.model_info?.id || String(i),
      name:     m.model_name || shortId(actual),
      provider: <Tag style={{ background: prov.color, color: '#fff' }}>{prov.label}</Tag>,
      actual:   <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{actual}</span>,
      actions: (
        <Button
          kind="ghost" size="sm" hasIconOnly
          renderIcon={TrashCan} iconDescription="삭제"
          onClick={() => handleDelete(m.model_info?.id || '', m.model_name || actual)}
        />
      ),
    };
  });

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>AI Models</h1>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            LiteLLM Gateway에 등록된 모델 관리
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button kind="ghost" hasIconOnly renderIcon={Renew} iconDescription="새로고침" onClick={load} />
          <Button kind="primary" renderIcon={Add} onClick={() => { setShowAdd(true); setSaveErr(''); }}>
            모델 등록
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <InlineNotification
          kind="error" title="오류" subtitle={error} lowContrast
          style={{ marginBottom: '16px' }}
          onCloseButtonClick={() => setError('')}
        />
      )}

      {/* Content */}
      {loading ? (
        <InlineLoading description="모델 목록 로딩 중..." />
      ) : models.length === 0 ? (
        <div style={{
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle-00)',
          padding: '48px',
          textAlign: 'center',
          marginTop: '16px',
        }}>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
            등록된 모델이 없습니다.
          </p>
          <p style={{ color: 'var(--cds-text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            OpenAI, Anthropic, Ollama 등의 모델을 등록하여 Agent가 사용할 LLM을 설정하세요.
          </p>
          <Button kind="primary" renderIcon={Add} onClick={() => setShowAdd(true)}>
            첫 번째 모델 등록
          </Button>
        </div>
      ) : (
        <DataTable rows={rows} headers={headers}>
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map(h => (
                    <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                      {h.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map(cell => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTable>
      )}

      {/* Add Model Modal */}
      <Modal
        open={showAdd}
        onRequestClose={() => setShowAdd(false)}
        onRequestSubmit={handleAdd}
        modalHeading="모델 등록"
        primaryButtonText={saving ? '등록 중...' : '등록'}
        secondaryButtonText="취소"
        primaryButtonDisabled={saving || !modelId.trim()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          {saveErr && (
            <InlineNotification kind="error" title="오류" subtitle={saveErr} lowContrast hideCloseButton />
          )}
          <Select
            id="add-provider" labelText="프로바이더"
            value={provider}
            onChange={e => { setProvider(e.target.value); setPreset(''); setModelId(''); }}
          >
            {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value} text={p.label} />)}
          </Select>

          {PRESETS[provider]?.length > 0 && (
            <Select
              id="add-preset" labelText="모델 선택 (프리셋)"
              value={preset}
              onChange={e => { setPreset(e.target.value); if (e.target.value) setModelId(e.target.value); }}
            >
              <SelectItem value="" text="-- 직접 입력 --" />
              {PRESETS[provider].map(m => <SelectItem key={m} value={m} text={m} />)}
            </Select>
          )}

          <TextInput
            id="add-model-id"
            labelText="Model ID"
            placeholder="openai/gpt-4o-mini"
            value={modelId}
            onChange={e => setModelId(e.target.value)}
            helperText="형식: provider/model-name (예: openai/gpt-4o, anthropic/claude-sonnet-4-6)"
          />

          <TextInput
            id="add-api-key"
            labelText="API Key (선택)"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            helperText="내부 모델(Ollama)은 불필요. 외부 모델은 해당 프로바이더 키 입력."
          />
        </div>
      </Modal>
    </div>
  );
}
