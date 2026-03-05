// @ts-nocheck
export interface BackupRecord {
  id: string;
  tier: number;
  status: string;
  size: number;
  path: string;
  error?: string;
  created_at: string;
}

export const backupApi = {
  async list(): Promise<{ backups: BackupRecord[] }> {
    const res = await fetch('/api/v1/backup');
    if (!res.ok) throw new Error('목록 조회 실패');
    return res.json();
  },

  async start(): Promise<{ id: string; status: string }> {
    const res = await fetch('/api/v1/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new Error('백업 시작 실패');
    return res.json();
  },

  async status(): Promise<{ id: string; phase: string; step: string; error: string }> {
    const res = await fetch('/api/v1/backup/status');
    if (!res.ok) throw new Error('상태 조회 실패');
    return res.json();
  },

  async restore(id: string, adminPassword: string): Promise<{ id: string; status: string }> {
    const res = await fetch(`/api/v1/backup/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESTORE', admin_password: adminPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '복원 시작 실패');
    }
    return res.json();
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/v1/backup/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('삭제 실패');
  },
};
