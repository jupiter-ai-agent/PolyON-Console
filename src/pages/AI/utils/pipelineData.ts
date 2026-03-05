import type { ModelInfo } from '../../../api/ai';

/* ── Provider metadata ── */
const PROVIDER_META: Record<string, { label: string; color: string; bg: string }> = {
  openai:    { label: 'OpenAI',         color: '#10a37f', bg: '#ecfdf5' },
  anthropic: { label: 'Anthropic',      color: '#d97706', bg: '#fffbeb' },
  gemini:    { label: 'Google Gemini',  color: '#4285f4', bg: '#eff6ff' },
  azure:     { label: 'Azure',          color: '#0078d4', bg: '#e8f4fd' },
  ollama:    { label: 'Ollama (Local)', color: '#6929c4', bg: '#f3e8ff' },
  bedrock:   { label: 'AWS Bedrock',    color: '#ff9900', bg: '#fff7ed' },
  cohere:    { label: 'Cohere',         color: '#6366f1', bg: '#eef2ff' },
  mistral:   { label: 'Mistral',        color: '#f97316', bg: '#fff7ed' },
};

export interface ProviderInfo {
  key: string;
  label: string;
  color: string;
  bg: string;
}

export interface PoolEntry {
  actual: string;
  prov: ProviderInfo;
  usedBy: string[];
  directId: string | null;
}

export interface ServiceItem {
  model_id: string;
  actual: string;
  prov: ProviderInfo;
}

export function getProvider(actualModel: string): ProviderInfo {
  if (!actualModel) return { key: 'unknown', label: 'Unknown', color: '#525252', bg: '#f4f4f4' };
  const p = actualModel.split('/')[0];
  const meta = PROVIDER_META[p];
  return meta
    ? { key: p, ...meta }
    : { key: p, label: p, color: '#525252', bg: '#f4f4f4' };
}

export function classifyModel(m: ModelInfo): 'service' | 'pool' {
  const name   = (m.model_name || '').trim();
  const actual = (m.litellm_params?.model || '').trim();
  if (!actual) return 'pool';
  if (actual !== name && !actual.endsWith('/' + name)) return 'service';
  return 'pool';
}

export function buildPoolMap(models: ModelInfo[]): Record<string, PoolEntry> {
  const pool: Record<string, PoolEntry> = {};
  models.forEach(m => {
    const actual    = (m.litellm_params?.model || m.model_name || '').trim();
    const name      = (m.model_name || '').trim();
    const isService = classifyModel(m) === 'service';
    if (!pool[actual]) {
      pool[actual] = { actual, prov: getProvider(actual), usedBy: [], directId: null };
    }
    if (isService) {
      if (!pool[actual].usedBy.includes(name)) pool[actual].usedBy.push(name);
    } else {
      pool[actual].directId = (m.model_info?.id as string) || m.model_name;
    }
  });
  return pool;
}

export function buildServiceGroups(models: ModelInfo[]): Record<string, ServiceItem[]> {
  const groups: Record<string, ServiceItem[]> = {};
  models.forEach(m => {
    if (classifyModel(m) !== 'service') return;
    const name    = (m.model_name || '').trim();
    const actual  = (m.litellm_params?.model || '').trim();
    const modelId = (m.model_info?.id as string) || '';
    if (!groups[name]) groups[name] = [];
    groups[name].push({ model_id: modelId, actual, prov: getProvider(actual) });
  });
  return groups;
}

export const MODEL_PRESETS: Record<string, string[]> = {
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-haiku-20240307'],
  gemini:    ['gemini/gemini-2.5-pro', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.0-flash'],
  azure:     ['azure/gpt-4o', 'azure/gpt-4o-mini'],
  bedrock:   ['bedrock/anthropic.claude-3-sonnet-20240229-v1:0'],
  ollama:    ['ollama/llama3.2', 'ollama/mistral', 'ollama/codestral'],
  cohere:    ['command-r-plus', 'command-r'],
  mistral:   ['mistral/mistral-large-latest', 'mistral/codestral-latest'],
};

export const AI_PROVIDERS = [
  { value: 'openai',    label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'gemini',    label: 'Google Gemini' },
  { value: 'azure',     label: 'Azure OpenAI' },
  { value: 'bedrock',   label: 'AWS Bedrock' },
  { value: 'ollama',    label: 'Ollama (Local)' },
  { value: 'cohere',    label: 'Cohere' },
  { value: 'mistral',   label: 'Mistral' },
];

export const MODEL_META: Record<string, { maxTokens: number; inputCost: string; outputCost: string }> = {
  'gpt-4o':                   { maxTokens: 128000, inputCost: '$5.00',  outputCost: '$15.00' },
  'gpt-4o-mini':              { maxTokens: 128000, inputCost: '$0.15',  outputCost: '$0.60' },
  'gpt-4-turbo':              { maxTokens: 128000, inputCost: '$10.00', outputCost: '$30.00' },
  'o1':                       { maxTokens: 200000, inputCost: '$15.00', outputCost: '$60.00' },
  'o1-mini':                  { maxTokens: 128000, inputCost: '$3.00',  outputCost: '$12.00' },
  'o3-mini':                  { maxTokens: 200000, inputCost: '$1.10',  outputCost: '$4.40' },
  'claude-sonnet-4-20250514': { maxTokens: 200000, inputCost: '$3.00',  outputCost: '$15.00' },
  'claude-opus-4-20250514':   { maxTokens: 200000, inputCost: '$15.00', outputCost: '$75.00' },
  'claude-3-haiku-20240307':  { maxTokens: 200000, inputCost: '$0.25',  outputCost: '$1.25' },
  'gemini-2.5-pro':           { maxTokens: 1000000, inputCost: '$1.25', outputCost: '$10.00' },
  'gemini-2.5-flash':         { maxTokens: 1000000, inputCost: '$0.30', outputCost: '$2.50' },
  'gemini-2.0-flash':         { maxTokens: 1000000, inputCost: '$0.10', outputCost: '$0.40' },
  'mistral-large-latest':     { maxTokens: 131072, inputCost: '$2.00',  outputCost: '$6.00' },
  'codestral-latest':         { maxTokens: 256000, inputCost: '$0.30',  outputCost: '$0.90' },
  'command-r-plus':           { maxTokens: 128000, inputCost: '$2.50',  outputCost: '$10.00' },
  'command-r':                { maxTokens: 128000, inputCost: '$0.15',  outputCost: '$0.60' },
  'llama3.2':                 { maxTokens: 128000, inputCost: 'Local',  outputCost: 'Local' },
  'codestral':                { maxTokens: 256000, inputCost: 'Local',  outputCost: 'Local' },
};
