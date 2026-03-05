// @ts-nocheck
export interface WorkstreamEvent {
  id: number;
  workstream_id: string;
  event_type: string;
  repo_name: string;
  ref: string;
  author: string;
  message: string;
  url: string;
  files_changed: number;
  additions: number;
  deletions: number;
  created_at: string;
}

export interface WorkstreamSummaryEntry {
  workstream_id: string;
  count: number;
}

export const workstreamApi = {
  listEvents: async (wsId?: string, limit = 50): Promise<WorkstreamEvent[]> => {
    const params = new URLSearchParams();
    if (wsId) params.set('ws_id', wsId);
    params.set('limit', String(limit));
    const res = await fetch(`/api/v1/workstream/events?${params}`);
    if (!res.ok) throw new Error('Failed to fetch workstream events');
    return res.json();
  },

  listRecent: async (limit = 20): Promise<WorkstreamEvent[]> => {
    const res = await fetch(`/api/v1/workstream/events/recent?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch recent events');
    return res.json();
  },

  getSummary: async (): Promise<WorkstreamSummaryEntry[]> => {
    const res = await fetch('/api/v1/workstream/events/summary');
    if (!res.ok) throw new Error('Failed to fetch workstream summary');
    return res.json();
  },
};
