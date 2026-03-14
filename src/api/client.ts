const BASE = '/api/v1';

let _getToken: (() => string | null) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
}

export function getToken(): string | null {
  return _getToken ? _getToken() : null;
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

  if (!res.ok) {
    const text = await res.text();
    let detail = `HTTP ${res.status}`;
    try {
      const err = JSON.parse(text) as Record<string, unknown>;
      detail = (err['detail'] as string) || (err['error'] as string) || detail;
    } catch {
      if (res.status === 401) detail = '인증이 만료되었습니다. 페이지를 새로고침하세요.';
      else if (res.status === 403) detail = '권한이 없습니다.';
      else if (text.length > 0) detail = text.substring(0, 200);
    }
    const apiError: any = new Error(detail);
    apiError.status = res.status;
    throw apiError;
  }

  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error('API 응답 파싱 실패');
  }

  return data;
}
