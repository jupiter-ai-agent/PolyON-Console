/**
 * PolyON Auth — Keycloak OIDC 통합 (런타임 설정, 인증 실패 시 차단)
 */
import { useState, useEffect } from 'react';
import { setTokenProvider } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { initKeycloak, getKeycloak } from './keycloak';

export interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  username: string;
  displayName: string;
  email: string;
  token: string | null;
  skipAuth: boolean;
  error: string | null;
  logout: () => void;
}

let _token: string | null = null;
let _username = '';
let _displayName = '';
let _email = '';
let _initialized = false;
let _error: string | null = null;
let _tokenUpdateInterval: number | null = null;

// Token provider registration (for API client)
setTokenProvider(() => _token);

function setupTokenRefresh(): void {
  if (_tokenUpdateInterval) {
    clearInterval(_tokenUpdateInterval);
  }

  _tokenUpdateInterval = setInterval(() => {
    const kc = getKeycloak();
    if (!kc) return;

    kc.updateToken(30)
      .then((refreshed) => {
        if (refreshed) {
          _token = kc.token || null;
        }
      })
      .catch(() => {
        console.warn('Token refresh failed — logging out');
        logout();
      });
  }, 60000);
}

function logout(): void {
  if (_tokenUpdateInterval) {
    clearInterval(_tokenUpdateInterval);
    _tokenUpdateInterval = null;
  }

  _token = null;
  _username = '';
  _displayName = '';
  _email = '';
  useAppStore.getState().setUsername('');

  const kc = getKeycloak();
  const origin = window.location.origin;

  if (kc?.authenticated) {
    const logoutUrl = `${kc.authServerUrl}/realms/${kc.realm}/protocol/openid-connect/logout`
      + `?client_id=${kc.clientId}`
      + `&id_token_hint=${kc.idToken || ''}`
      + `&post_logout_redirect_uri=${encodeURIComponent(origin)}`;
    window.location.replace(logoutUrl);
  } else {
    window.location.replace(origin);
  }
}

export async function initAuth(): Promise<AuthState> {
  // 1. Core API에서 Keycloak 설정 조회
  let kc;
  try {
    kc = await initKeycloak();
  } catch (err) {
    console.error('Keycloak 설정 로드 실패:', err);
    _initialized = true;
    _error = err instanceof Error ? err.message : 'Keycloak 설정을 불러올 수 없습니다';
    return buildState();
  }

  // 2. Keycloak OIDC PKCE 인증
  try {
    const authenticated = await kc.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    if (authenticated) {
      _token = kc.token || null;
      _username = kc.tokenParsed?.preferred_username || 'unknown';
      _displayName = kc.tokenParsed?.name || kc.tokenParsed?.given_name || '';
      _email = kc.tokenParsed?.email || '';

      useAppStore.getState().setUsername(_username);
      setupTokenRefresh();
    }
  } catch (err) {
    console.error('Keycloak 인증 실패:', err);
    _initialized = true;
    _error = 'Keycloak 인증 서버에 연결할 수 없습니다. 네트워크 및 인증서를 확인하세요.';
    return buildState();
  }

  _initialized = true;
  _error = null;
  return buildState();
}

function buildState(): AuthState {
  return {
    initialized: _initialized,
    authenticated: _token !== null,
    username: _username,
    displayName: _displayName,
    email: _email,
    token: _token,
    skipAuth: false,
    error: _error,
    logout,
  };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(buildState);

  useEffect(() => {
    if (!_initialized) {
      initAuth().then((s) => setState(s));
    }
  }, []);

  return state;
}
