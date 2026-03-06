import { useEffect, useState, useCallback } from 'react';
import {
  Button,
  TextInput,
  Select,
  SelectItem,
  Modal,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Add, Close, Copy, TrashCan, Api } from '@carbon/icons-react';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { aiApi }      from '../../api/ai';
import type { AIKey } from '../../api/ai';

interface CreateKeyPayload {
  key_alias: string;
  max_budget?: number;
  models?: string[];
  duration?: string;
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [name,    setName]    = useState('');
  const [budget,  setBudget]  = useState('');
  const [models,  setModels]  = useState('');
  const [expiry,  setExpiry]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Enter a key name.'); return; }
    setLoading(true); setError('');

    const payload: CreateKeyPayload = { key_alias: name.trim() };
    if (budget) payload.max_budget = parseFloat(budget);
    if (models) payload.models = models.split(',').map(s => s.trim()).filter(Boolean);
    if (expiry) payload.duration = expiry;

    try {
      const result = await aiApi.createKey(payload);
      const newKey = result.key || result.token || '';
      onCreated(newKey);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      modalHeading="Create API Key"
      primaryButtonText={loading ? 'Creating...' : 'Create Key'}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={loading}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        <TextInput
          id="key-name"
          labelText="Key Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. dev-team-chatbot"
          helperText="Identifies this key"
        />
        <TextInput
          id="key-budget"
          labelText="Monthly Budget (USD)"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          placeholder="10.00"
          helperText="Leave empty for unlimited"
        />
        <TextInput
          id="key-models"
          labelText="Model Restrictions"
          value={models}
          onChange={e => setModels(e.target.value)}
          placeholder="gpt-4o, claude-sonnet-4"
          helperText="Comma-separated. Leave empty to allow all models"
        />
        <Select
          id="key-expiry"
          labelText="Expiry"
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
        >
          <SelectItem value="" text="No expiry" />
          <SelectItem value="30d" text="30 days" />
          <SelectItem value="90d" text="90 days" />
          <SelectItem value="365d" text="1 year" />
        </Select>
        {error && (
          <div style={{ padding: '8px 12px', background: '#fff1f1', border: '1px solid #ffd7d9', color: '#da1e28', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AIKeysPage() {
  const [keys,        setKeys]        = useState<AIKey[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showCreate,  setShowCreate]  = useState(false);
  const [createdKey,  setCreatedKey]  = useState('');
  const [copiedKey,   setCopiedKey]   = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiApi.getKeys();
      let keys = data.keys || [];
      if (Array.isArray(keys) && keys.length && Array.isArray(keys[0])) {
        keys = (keys as unknown as AIKey[][]).flat();
      }
      setKeys(Array.isArray(keys) ? keys : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleDelete = async (keyId: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await aiApi.deleteKey(keyId);
      loadKeys();
    } catch (e: unknown) {
      alert('Failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const tableHeaders = [
    { key: 'name',    header: 'Name' },
    { key: 'token',   header: 'Key' },
    { key: 'budget',  header: 'Budget Limit' },
    { key: 'spend',   header: 'Usage' },
    { key: 'models',  header: 'Model Restrictions' },
    { key: 'expires', header: 'Expires' },
    { key: 'actions', header: '' },
  ];

  const tableRows = keys.map((k, i) => ({
    id:      String(i),
    name:    k.key_alias || k.key_name || '—',
    token:   k.token ? 'sk-...' + k.token.slice(-6) : '—',
    budget:  k.max_budget != null ? '$' + k.max_budget : '∞',
    spend:   '$' + (k.spend || 0).toFixed(4),
    models:  k.models && k.models.length ? k.models.join(', ') : 'All models',
    expires: k.expires ? new Date(k.expires).toLocaleDateString('ko-KR') : 'None',
    actions: k.token || k.key || '',
  }));

  return (
    <>
      <PageHeader
        title="API Key Management"
        description="Issue and manage AI API keys by team or department"
        actions={
          <Button
            kind="primary"
            renderIcon={Add}
            onClick={() => setShowCreate(true)}
          >
            Create Key
          </Button>
        }
      />

      {/* Created key banner */}
      {createdKey && (
        <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: '#defbe6', border: '1px solid #24a148', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <svg viewBox="0 0 32 32" width="20" height="20" fill="#24a148"><path d="M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,26A12,12,0,1,1,28,16,12,12,0,0,1,16,28Z"/><path d="M14 21.5L9 16.5 10.59 15.09 14 18.67 21.41 11.26 23 12.67 14 21.5z"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0e6027' }}>API key created successfully</div>
            <div style={{ fontSize: '0.75rem', color: '#044317', marginTop: '0.25rem' }}>Copy this key now — it will not be shown again.</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ background: '#fff', padding: '4px 10px', fontSize: '0.8125rem', fontFamily: "'IBM Plex Mono', monospace", border: '1px solid #a7f0ba' }}>
                {createdKey}
              </code>
              <Button
                kind="ghost"
               
                renderIcon={Copy}
                onClick={handleCopy}
              >
                {copiedKey ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          <Button
            kind="ghost"
            hasIconOnly
            renderIcon={Close}
            iconDescription="Dismiss"
            onClick={() => setCreatedKey('')}
           
          />
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', color: 'var(--cds-text-secondary)' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#da1e28' }}>Error: {error}</div>
        ) : keys.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
            <EmptyState
              icon={Api}
              title="No API keys created"
              description="Create your first API key to start accessing our AI services."
              action={
                <Button
                  kind="primary"
                  renderIcon={Add}
                  onClick={() => setShowCreate(true)}
                >
                  Create Key
                </Button>
              }
            />
          </div>
        ) : (
          <DataTable rows={tableRows} headers={tableHeaders}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map(h => (
                      <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                        {h.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map(cell => {
                        if (cell.info.header === 'token') {
                          return (
                            <TableCell key={cell.id}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
                                {cell.value}
                              </span>
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'models') {
                          return (
                            <TableCell key={cell.id}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {cell.value}
                              </span>
                            </TableCell>
                          );
                        }
                        if (cell.info.header === 'actions') {
                          return (
                            <TableCell key={cell.id}>
                              <Button
                                kind="danger--ghost"
                               
                                renderIcon={TrashCan}
                                onClick={() => handleDelete(cell.value as string)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          );
                        }
                        return <TableCell key={cell.id}>{cell.value}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTable>
        )}
      </div>

      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(key) => { setCreatedKey(key); loadKeys(); }}
        />
      )}
    </>
  );
}
