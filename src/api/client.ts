const BASE = '/api/v1';

let _getToken: (() => string | null) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = _getToken ? _getToken() : null;
  const authHeader: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...opts?.headers,
      },
    });
  } catch {
    throw new Error('API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
  }

  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error('API 서버에 연결할 수 없습니다.');
  }

  if (!res.ok) {
    const err = data as Record<string, unknown>;
    throw new Error(
      (err['detail'] as string) || (err['error'] as string) || `API ${res.status}`
    );
  }

  return data;
}
