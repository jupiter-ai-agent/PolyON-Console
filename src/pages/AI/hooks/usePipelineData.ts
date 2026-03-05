import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { aiApi } from '../../../api/ai';
import type { Agent, MemoryStats, ModelInfo } from '../../../api/ai';
import { buildPipelineLayout } from '../utils/layoutNodes';
import { buildPoolMap, buildServiceGroups } from '../utils/pipelineData';
import type { PoolEntry, ServiceItem } from '../utils/pipelineData';

interface PipelineState {
  nodes:         Node[];
  edges:         Edge[];
  poolMap:       Record<string, PoolEntry>;
  serviceGroups: Record<string, ServiceItem[]>;
  rawModels:     ModelInfo[];
  loading:       boolean;
  error:         string | null;
}

export function usePipelineData() {
  const [state, setState] = useState<PipelineState>({
    nodes:         [],
    edges:         [],
    poolMap:       {},
    serviceGroups: {},
    rawModels:     [],
    loading:       true,
    error:         null,
  });

  const reload = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [modelsRes, agentsRes, memRes] = await Promise.allSettled([
        aiApi.getModelsInfo(),
        aiApi.getAgents(),
        aiApi.getMemoryStats(),
      ]);

      const models: ModelInfo[] =
        modelsRes.status === 'fulfilled' ? (modelsRes.value.data || []) : [];
      const agents: Agent[] =
        agentsRes.status === 'fulfilled' ? (agentsRes.value.agents || []) : [];
      const memoryStats: MemoryStats | null =
        memRes.status === 'fulfilled' ? memRes.value : null;

      const poolMap       = buildPoolMap(models);
      const serviceGroups = buildServiceGroups(models);
      const { nodes, edges } = buildPipelineLayout(models, agents, memoryStats);

      setState({
        nodes,
        edges,
        poolMap,
        serviceGroups,
        rawModels: models,
        loading:   false,
        error:     null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '데이터를 불러올 수 없습니다';
      setState(prev => ({ ...prev, loading: false, error: msg }));
    }
  }, []);

  return { ...state, reload };
}
