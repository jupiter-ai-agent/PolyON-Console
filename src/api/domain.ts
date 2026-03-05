// @ts-nocheck
// Domain management API client
// Wraps /api/v1/settings/domain and /api/v1/apps/{appID}/domain endpoints.

export const domainApi = {
  getSettings: () =>
    fetch('/api/v1/settings/domain').then(r => r.json()),

  updateSettings: (data: {
    service_base_domain?: string;
    console_domain?: string;
    portal_domain?: string;
    mail_domain?: string;
  }) =>
    fetch('/api/v1/settings/domain', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),

  updateAppDomain: (appId: string, data: { subdomain: string; status?: string }) =>
    fetch(`/api/v1/apps/${appId}/domain`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};
