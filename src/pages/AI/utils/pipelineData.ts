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

// ── Provider / Model 카탈로그 (2026-03 기준) ──────────────────────────────────
// 무료(Free) 표시 = 무료 tier 또는 오픈소스 로컬 실행 가능
// 임베딩 모델은 (Embed) 표시

export const AI_PROVIDERS = [
  // ── 유료 외부 ──
  { value: 'openai',       label: 'OpenAI',              group: 'paid' },
  { value: 'anthropic',    label: 'Anthropic (Claude)',   group: 'paid' },
  { value: 'gemini',       label: 'Google Gemini',        group: 'paid' },
  { value: 'azure',        label: 'Azure OpenAI',         group: 'paid' },
  { value: 'bedrock',      label: 'AWS Bedrock',          group: 'paid' },
  { value: 'mistral',      label: 'Mistral AI',           group: 'paid' },
  { value: 'cohere',       label: 'Cohere',               group: 'paid' },
  { value: 'xai',          label: 'xAI (Grok)',           group: 'paid' },
  { value: 'deepseek',     label: 'DeepSeek',             group: 'paid' },
  { value: 'groq',         label: 'Groq (Free tier 🆓)',  group: 'free' },
  { value: 'together_ai',  label: 'Together AI (Free 🆓)', group: 'free' },
  { value: 'openrouter',   label: 'OpenRouter (Free 🆓)',  group: 'free' },
  { value: 'huggingface',  label: 'HuggingFace (Free 🆓)', group: 'free' },
  // ── 로컬 ──
  { value: 'ollama',       label: 'Ollama (Local 🏠)',    group: 'local' },
  { value: 'lm_studio',    label: 'LM Studio (Local 🏠)', group: 'local' },
];

export const MODEL_PRESETS: Record<string, { id: string; label: string; free?: boolean; embed?: boolean }[]> = {
  // ── OpenAI ──────────────────────────────────────────────────────────────
  openai: [
    { id: 'openai/gpt-4o',                    label: 'GPT-4o (멀티모달)' },
    { id: 'openai/gpt-4o-mini',               label: 'GPT-4o mini (경량)' },
    { id: 'openai/o3-mini',                   label: 'o3-mini (추론)' },
    { id: 'openai/o1',                        label: 'o1 (고급 추론)' },
    { id: 'openai/gpt-4-turbo',               label: 'GPT-4 Turbo' },
    { id: 'openai/text-embedding-3-small',    label: 'Embedding 3 Small (Embed)', embed: true },
    { id: 'openai/text-embedding-3-large',    label: 'Embedding 3 Large (Embed)', embed: true },
  ],
  // ── Anthropic ────────────────────────────────────────────────────────────
  anthropic: [
    { id: 'anthropic/claude-opus-4-6',        label: 'Claude Opus 4.6 (최상위)' },
    { id: 'anthropic/claude-sonnet-4-6',      label: 'Claude Sonnet 4.6 (균형)' },
    { id: 'anthropic/claude-haiku-3-5',       label: 'Claude Haiku 3.5 (경량)' },
    { id: 'anthropic/claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  // ── Google Gemini ────────────────────────────────────────────────────────
  gemini: [
    { id: 'gemini/gemini-2.5-pro-preview',    label: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini/gemini-2.5-flash-preview',  label: 'Gemini 2.5 Flash Preview' },
    { id: 'gemini/gemini-2.0-flash',          label: 'Gemini 2.0 Flash' },
    { id: 'gemini/gemini-1.5-pro',            label: 'Gemini 1.5 Pro (1M ctx)' },
    { id: 'gemini/gemini-1.5-flash',          label: 'Gemini 1.5 Flash (무료 tier)', free: true },
    { id: 'gemini/text-embedding-004',        label: 'Text Embedding 004 (Embed)', embed: true },
  ],
  // ── xAI ──────────────────────────────────────────────────────────────────
  xai: [
    { id: 'xai/grok-3',                       label: 'Grok-3' },
    { id: 'xai/grok-3-mini',                  label: 'Grok-3 mini' },
    { id: 'xai/grok-2-vision-1212',           label: 'Grok-2 Vision' },
  ],
  // ── DeepSeek ─────────────────────────────────────────────────────────────
  deepseek: [
    { id: 'deepseek/deepseek-chat',           label: 'DeepSeek V3 (저렴)' },
    { id: 'deepseek/deepseek-reasoner',       label: 'DeepSeek R1 (추론)' },
  ],
  // ── Mistral ──────────────────────────────────────────────────────────────
  mistral: [
    { id: 'mistral/mistral-large-latest',     label: 'Mistral Large' },
    { id: 'mistral/mistral-small-latest',     label: 'Mistral Small' },
    { id: 'mistral/codestral-latest',         label: 'Codestral (코딩 특화)' },
    { id: 'mistral/mistral-embed',            label: 'Mistral Embed (Embed)', embed: true },
  ],
  // ── Cohere ───────────────────────────────────────────────────────────────
  cohere: [
    { id: 'cohere/command-r-plus',            label: 'Command R+' },
    { id: 'cohere/command-r',                 label: 'Command R' },
    { id: 'cohere/command-r7b-12-2024',       label: 'Command R7B (경량)' },
    { id: 'cohere/embed-multilingual-v3.0',   label: 'Embed Multilingual v3 (Embed)', embed: true },
  ],
  // ── Groq (무료 tier 포함) ─────────────────────────────────────────────────
  groq: [
    { id: 'groq/llama-3.3-70b-versatile',     label: 'Llama 3.3 70B (무료 🆓)', free: true },
    { id: 'groq/llama-3.1-8b-instant',        label: 'Llama 3.1 8B Instant (무료 🆓)', free: true },
    { id: 'groq/mixtral-8x7b-32768',          label: 'Mixtral 8x7B (무료 🆓)', free: true },
    { id: 'groq/gemma2-9b-it',                label: 'Gemma2 9B (무료 🆓)', free: true },
    { id: 'groq/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Llama 70B (무료 🆓)', free: true },
  ],
  // ── Together AI (무료 tier / 오픈소스) ────────────────────────────────────
  together_ai: [
    { id: 'together_ai/meta-llama/Llama-3-70b-chat-hf',   label: 'Llama 3 70B Chat' },
    { id: 'together_ai/mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct' },
    { id: 'together_ai/Qwen/Qwen2.5-72B-Instruct',        label: 'Qwen 2.5 72B' },
    { id: 'together_ai/togethercomputer/m2-bert-80M-8k-retrieval', label: 'M2-BERT Embed (Embed)', embed: true },
  ],
  // ── OpenRouter (무료 모델 포함) ───────────────────────────────────────────
  openrouter: [
    { id: 'openrouter/google/gemini-2.0-flash-exp:free',  label: 'Gemini 2.0 Flash Exp (무료 🆓)', free: true },
    { id: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (무료 🆓)', free: true },
    { id: 'openrouter/deepseek/deepseek-r1:free',         label: 'DeepSeek R1 (무료 🆓)', free: true },
    { id: 'openrouter/qwen/qwen3-235b-a22b:free',         label: 'Qwen3 235B (무료 🆓)', free: true },
    { id: 'openrouter/microsoft/phi-4:free',              label: 'Phi-4 (무료 🆓)', free: true },
    { id: 'openrouter/anthropic/claude-sonnet-4-6',       label: 'Claude Sonnet 4.6 (via OpenRouter)' },
    { id: 'openrouter/openai/gpt-4o',                     label: 'GPT-4o (via OpenRouter)' },
  ],
  // ── HuggingFace (무료) ────────────────────────────────────────────────────
  huggingface: [
    { id: 'huggingface/meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B (무료 🆓)', free: true },
    { id: 'huggingface/Qwen/Qwen2.5-7B-Instruct',         label: 'Qwen 2.5 7B (무료 🆓)', free: true },
    { id: 'huggingface/microsoft/phi-4',                  label: 'Phi-4 (무료 🆓)', free: true },
    { id: 'huggingface/BAAI/bge-m3',                      label: 'BGE-M3 Multilingual (Embed 🆓)', embed: true, free: true },
  ],
  // ── Azure OpenAI ─────────────────────────────────────────────────────────
  azure: [
    { id: 'azure/gpt-4o',                     label: 'GPT-4o' },
    { id: 'azure/gpt-4o-mini',                label: 'GPT-4o mini' },
    { id: 'azure/o3-mini',                    label: 'o3-mini' },
    { id: 'azure/text-embedding-3-small',     label: 'Embedding 3 Small (Embed)', embed: true },
  ],
  // ── AWS Bedrock ───────────────────────────────────────────────────────────
  bedrock: [
    { id: 'bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet v2' },
    { id: 'bedrock/anthropic.claude-3-haiku-20240307-v1:0',    label: 'Claude 3 Haiku' },
    { id: 'bedrock/amazon.nova-pro-v1:0',     label: 'Amazon Nova Pro' },
    { id: 'bedrock/amazon.nova-lite-v1:0',    label: 'Amazon Nova Lite' },
    { id: 'bedrock/amazon.titan-embed-text-v2:0', label: 'Titan Text Embed v2 (Embed)', embed: true },
  ],
  // ── Ollama (로컬) ─────────────────────────────────────────────────────────
  ollama: [
    { id: 'ollama/llama3.2',                  label: 'Llama 3.2 3B (🏠)' },
    { id: 'ollama/llama3.2:1b',               label: 'Llama 3.2 1B (경량 🏠)' },
    { id: 'ollama/llama3.1:8b',               label: 'Llama 3.1 8B (🏠)' },
    { id: 'ollama/llama3.1:70b',              label: 'Llama 3.1 70B (🏠)' },
    { id: 'ollama/qwen2.5:7b',                label: 'Qwen 2.5 7B (🏠)' },
    { id: 'ollama/qwen2.5:72b',               label: 'Qwen 2.5 72B (🏠)' },
    { id: 'ollama/deepseek-r1:8b',            label: 'DeepSeek R1 8B (추론 🏠)' },
    { id: 'ollama/deepseek-r1:32b',           label: 'DeepSeek R1 32B (추론 🏠)' },
    { id: 'ollama/gemma3:4b',                 label: 'Gemma3 4B (🏠)' },
    { id: 'ollama/phi4',                      label: 'Phi-4 14B (🏠)' },
    { id: 'ollama/mistral',                   label: 'Mistral 7B (🏠)' },
    { id: 'ollama/codestral',                 label: 'Codestral 22B (코딩 🏠)' },
    { id: 'ollama/nomic-embed-text',          label: 'Nomic Embed Text (Embed 🏠)', embed: true },
    { id: 'ollama/mxbai-embed-large',         label: 'MxBai Embed Large (Embed 🏠)', embed: true },
  ],
  // ── LM Studio (로컬) ──────────────────────────────────────────────────────
  lm_studio: [
    { id: 'lm_studio/local-model',            label: 'LM Studio 실행 중인 모델' },
  ],
};

export const MODEL_META: Record<string, { maxTokens: number; inputCost: string; outputCost: string }> = {
  // OpenAI
  'gpt-4o':                         { maxTokens: 128000,  inputCost: '$2.50',   outputCost: '$10.00' },
  'gpt-4o-mini':                    { maxTokens: 128000,  inputCost: '$0.15',   outputCost: '$0.60' },
  'o3-mini':                        { maxTokens: 200000,  inputCost: '$1.10',   outputCost: '$4.40' },
  'o1':                             { maxTokens: 200000,  inputCost: '$15.00',  outputCost: '$60.00' },
  'gpt-4-turbo':                    { maxTokens: 128000,  inputCost: '$10.00',  outputCost: '$30.00' },
  'text-embedding-3-small':         { maxTokens: 8192,    inputCost: '$0.02',   outputCost: '—' },
  'text-embedding-3-large':         { maxTokens: 8192,    inputCost: '$0.13',   outputCost: '—' },
  // Anthropic
  'claude-opus-4-6':                { maxTokens: 200000,  inputCost: '$15.00',  outputCost: '$75.00' },
  'claude-sonnet-4-6':              { maxTokens: 200000,  inputCost: '$3.00',   outputCost: '$15.00' },
  'claude-haiku-3-5':               { maxTokens: 200000,  inputCost: '$0.80',   outputCost: '$4.00' },
  'claude-3-opus-20240229':         { maxTokens: 200000,  inputCost: '$15.00',  outputCost: '$75.00' },
  // Gemini
  'gemini-2.5-pro-preview':         { maxTokens: 1000000, inputCost: '$1.25',   outputCost: '$10.00' },
  'gemini-2.5-flash-preview':       { maxTokens: 1000000, inputCost: '$0.15',   outputCost: '$0.60' },
  'gemini-2.0-flash':               { maxTokens: 1000000, inputCost: '$0.10',   outputCost: '$0.40' },
  'gemini-1.5-pro':                 { maxTokens: 2000000, inputCost: '$1.25',   outputCost: '$5.00' },
  'gemini-1.5-flash':               { maxTokens: 1000000, inputCost: '무료↑',  outputCost: '무료↑' },
  // xAI
  'grok-3':                         { maxTokens: 131072,  inputCost: '$3.00',   outputCost: '$15.00' },
  'grok-3-mini':                    { maxTokens: 131072,  inputCost: '$0.30',   outputCost: '$0.50' },
  // DeepSeek
  'deepseek-chat':                  { maxTokens: 128000,  inputCost: '$0.07',   outputCost: '$1.10' },
  'deepseek-reasoner':              { maxTokens: 128000,  inputCost: '$0.55',   outputCost: '$2.19' },
  // Mistral
  'mistral-large-latest':           { maxTokens: 131072,  inputCost: '$2.00',   outputCost: '$6.00' },
  'mistral-small-latest':           { maxTokens: 32768,   inputCost: '$0.10',   outputCost: '$0.30' },
  'codestral-latest':               { maxTokens: 256000,  inputCost: '$0.30',   outputCost: '$0.90' },
  // Groq (무료 tier)
  'llama-3.3-70b-versatile':        { maxTokens: 128000,  inputCost: '무료↑',  outputCost: '무료↑' },
  'llama-3.1-8b-instant':           { maxTokens: 128000,  inputCost: '무료↑',  outputCost: '무료↑' },
  'mixtral-8x7b-32768':             { maxTokens: 32768,   inputCost: '무료↑',  outputCost: '무료↑' },
  'gemma2-9b-it':                   { maxTokens: 8192,    inputCost: '무료↑',  outputCost: '무료↑' },
  // Ollama (로컬)
  'llama3.2':                       { maxTokens: 128000,  inputCost: '로컬',   outputCost: '로컬' },
  'llama3.1:8b':                    { maxTokens: 128000,  inputCost: '로컬',   outputCost: '로컬' },
  'deepseek-r1:8b':                 { maxTokens: 131072,  inputCost: '로컬',   outputCost: '로컬' },
  'qwen2.5:7b':                     { maxTokens: 128000,  inputCost: '로컬',   outputCost: '로컬' },
  'codestral':                      { maxTokens: 256000,  inputCost: '로컬',   outputCost: '로컬' },
  'nomic-embed-text':               { maxTokens: 8192,    inputCost: '로컬',   outputCost: '로컬' },
};
