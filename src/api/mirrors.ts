// @ts-nocheck
export const mirrorsApi = {
  getStatus: async () => {
    const res = await fetch('/api/v1/mirrors/status');
    if (!res.ok) throw new Error('Failed to fetch mirror status');
    return res.json();
  },

  listPushMirrors: async (owner: string, repo: string) => {
    const res = await fetch(`/api/v1/mirrors/${owner}/${repo}/push`);
    if (!res.ok) throw new Error('Failed to fetch push mirrors');
    return res.json();
  },

  addPushMirror: async (owner: string, repo: string, data: {
    remote_address: string;
    token: string;
    interval: string;
    sync_on_commit: boolean;
  }) => {
    const res = await fetch(`/api/v1/mirrors/${owner}/${repo}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add push mirror');
    return res.json();
  },

  deletePushMirror: async (owner: string, repo: string, mirrorId: number) => {
    const res = await fetch(`/api/v1/mirrors/${owner}/${repo}/push/${mirrorId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete push mirror');
  },

  createPullMirror: async (data: {
    name: string;
    clone_addr: string;
    description?: string;
    interval?: string;
  }) => {
    const res = await fetch('/api/v1/mirrors/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create pull mirror');
    return res.json();
  },
};
