import type { Node, Edge } from '@xyflow/react';
import type { Agent, MemoryStats } from '../../../api/ai';
import { buildServiceGroups, getProvider } from './pipelineData';
import type { ServiceItem } from './pipelineData';
import type { ModelInfo } from '../../../api/ai';

/* ── Node data types ── */
export interface ConsumerNodeData {
  name: string;
  subType: 'agent' | 'memory';
  status: string;
  usesModels: string[];
  [key: string]: unknown;
}

export interface ServiceNodeData {
  name: string;
  modelCount: number;
  items: ServiceItem[];
  [key: string]: unknown;
}

export interface ModelNodeData {
  actual: string;
  shortName: string;
  isPrimary: boolean;
  model_id: string;
  svcName: string;
  prov: { key: string; label: string; color: string; bg: string };
  [key: string]: unknown;
}

export interface ProviderNodeData {
  prov: { key: string; label: string; color: string; bg: string };
  [key: string]: unknown;
}

/* Column X positions */
const CON_X  = 60;
const SVC_X  = 320;
const MDL_X  = 600;
const PROV_X = 860;

const CON_W  = 160;
const SVC_W  = 200;
const MDL_W  = 190;
const PROV_W = 150;

const MDL_H      = 60;
const ROW_GAP    = 18;
const SVC_TOP    = 44;
const SVC_BOT    = 14;
const SVC_ITEM_H = MDL_H + ROW_GAP;

export function buildPipelineLayout(
  models: ModelInfo[],
  agents: Agent[],
  memoryStats: MemoryStats | null,
): { nodes: Node[]; edges: Edge[] } {
  const serviceGroups = buildServiceGroups(models);
  const serviceNames  = Object.keys(serviceGroups);

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  /* ── Consumers ── */
  const consumers: Array<{ id: string; name: string; subType: 'agent' | 'memory'; status: string; usesModels: string[] }> = [];

  if (agents && agents.length > 0) {
    agents.forEach(a => {
      consumers.push({
        id:         'con_' + (a.id || 'polyon'),
        name:       a.name || '@polyon',
        subType:    'agent',
        status:     a.status || 'unknown',
        usesModels: ['polyon-default', 'gemini-2.5-flash'],
      });
    });
  } else {
    consumers.push({
      id:         'con_polyon',
      name:       '@polyon',
      subType:    'agent',
      status:     'unknown',
      usesModels: ['polyon-default'],
    });
  }

  if (memoryStats) {
    consumers.push({
      id:         'con_mem0',
      name:       'Mem0',
      subType:    'memory',
      status:     memoryStats.status || 'unknown',
      usesModels: ['text-embedding-3-small'],
    });
  }

  const CON_H = 80;
  consumers.forEach((c, ci) => {
    nodes.push({
      id:       c.id,
      type:     'consumer',
      position: { x: CON_X, y: 60 + ci * (CON_H + 28) },
      data:     { name: c.name, subType: c.subType, status: c.status, usesModels: c.usesModels },
    });
  });

  /* ── svcConsumerMap (for edges) ── */
  const svcConsumerMap: Record<string, string[]> = {};
  consumers.forEach(c => {
    (c.usesModels || []).forEach(m => {
      if (!svcConsumerMap[m]) svcConsumerMap[m] = [];
      svcConsumerMap[m].push(c.id);
    });
  });

  /* ── Services + Models + Providers ── */
  let cursor = 60;
  serviceNames.forEach((svcName, si) => {
    const items    = serviceGroups[svcName] || [];
    const rowCount = Math.max(items.length, 1);
    const svcH     = SVC_TOP + rowCount * SVC_ITEM_H - ROW_GAP + SVC_BOT;
    const svcId    = 'svc_' + si;

    nodes.push({
      id:       svcId,
      type:     'service',
      position: { x: SVC_X, y: cursor },
      data:     {
        name:       svcName,
        modelCount: items.length,
        items:      items,
      },
    });

    /* Consumer → Service edges */
    (svcConsumerMap[svcName] || []).forEach((conId, idx) => {
      edges.push({
        id:             `e_${conId}_${svcId}`,
        source:         conId,
        target:         svcId,
        type:           'pipeline',
        sourceHandle:   'out',
        targetHandle:   'in',
        data:           { kind: 'consumer', idx },
      });
    });

    const seenProv: Record<string, boolean> = {};
    items.forEach((item, mi) => {
      const mdlId     = `mdl_${si}_${mi}`;
      const isPrimary = mi === 0;
      const mdlY      = cursor + SVC_TOP + mi * SVC_ITEM_H;
      const shortName = item.actual.includes('/') ? item.actual.split('/').pop()! : item.actual;

      nodes.push({
        id:       mdlId,
        type:     'model',
        position: { x: MDL_X, y: mdlY },
        data:     {
          actual:    item.actual,
          shortName,
          isPrimary,
          model_id:  item.model_id,
          svcName,
          prov:      item.prov,
        },
      });

      edges.push({
        id:           `e_${svcId}_${mdlId}`,
        source:       svcId,
        target:       mdlId,
        type:         'pipeline',
        sourceHandle: `out_${mi}`,
        targetHandle: 'in',
        data:         { kind: isPrimary ? 'primary' : 'fallback' },
      });

      const provKey    = item.prov.key || 'unknown';
      const provNodeId = `prov_${si}_${provKey}`;
      if (!seenProv[provKey]) {
        seenProv[provKey] = true;
        nodes.push({
          id:       provNodeId,
          type:     'provider',
          position: { x: PROV_X, y: mdlY + (MDL_H - 44) / 2 },
          data:     { prov: item.prov },
        });
      }

      edges.push({
        id:           `e_${mdlId}_${provNodeId}`,
        source:       mdlId,
        target:       provNodeId,
        type:         'pipeline',
        sourceHandle: 'out',
        targetHandle: 'in',
        data:         { kind: 'provider', provColor: item.prov.color },
      });
    });

    cursor += svcH + 40;
  });

  /* ── Pool-only models that appear in consumers but have no service ── */
  // (text-embedding-3-small etc.)
  consumers.forEach(c => {
    (c.usesModels || []).forEach(m => {
      if (serviceGroups[m]) return;
      // direct model reference
      const poolModel = models.find(mo => (mo.model_name || '').trim() === m);
      if (!poolModel) return;
      const actual    = (poolModel.litellm_params?.model || poolModel.model_name || '').trim();
      const prov      = getProvider(actual);
      const mdlId     = `mdl_direct_${m.replace(/[^a-z0-9]/gi, '_')}`;
      const provNodeId = `prov_direct_${prov.key}`;

      if (!nodes.find(n => n.id === mdlId)) {
        nodes.push({
          id:       mdlId,
          type:     'model',
          position: { x: MDL_X, y: cursor },
          data:     {
            actual,
            shortName: actual.includes('/') ? actual.split('/').pop()! : actual,
            isPrimary: true,
            model_id:  (poolModel.model_info?.id as string) || '',
            svcName:   '',
            prov,
          },
        });
        if (!nodes.find(n => n.id === provNodeId)) {
          nodes.push({
            id:       provNodeId,
            type:     'provider',
            position: { x: PROV_X, y: cursor + (MDL_H - 44) / 2 },
            data:     { prov },
          });
        }
        edges.push({
          id:           `e_${c.id}_${mdlId}`,
          source:       c.id,
          target:       mdlId,
          type:         'pipeline',
          sourceHandle: 'out',
          targetHandle: 'in',
          data:         { kind: 'consumer' },
        });
        edges.push({
          id:           `e_${mdlId}_${provNodeId}`,
          source:       mdlId,
          target:       provNodeId,
          type:         'pipeline',
          sourceHandle: 'out',
          targetHandle: 'in',
          data:         { kind: 'provider', provColor: prov.color },
        });
        cursor += MDL_H + 40;
      }
    });
  });

  return { nodes, edges };
}

export { CON_W, SVC_W, MDL_W, PROV_W, MDL_H };
