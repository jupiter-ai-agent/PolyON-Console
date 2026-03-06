/**
 * PolyON Auth — Keycloak OIDC 통합
 */
import { useState, useEffect } from 'react';
import { setTokenProvider } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import keycloak from './keycloak';

export interface AuthState {
  initialized: boolean;
  authenticated: boolean;
  username: string;
  displayName: string;
  email: string;
  token: string | null;
  skipAuth: boolean;
  logout: () => void;
}

let _token: string | null = null;
let _username = '';
let _displayName = '';
let _email = '';
let _initialized = false;
let _skipAuth = false;
let _tokenUpdateInterval: number | null = null;

// Token provider registration (for API client)
setTokenProvider(() => _token);

async function checkProvisionState(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const res = await fetch('/api/sentinel/state', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const status = (await res.json()) as Record<string, unknown>;
      return status['provisioned'] === true || status['state'] === 'running';
    }
  } catch {
    // ignore — Operator unreachable = assume provisioned
  }
  return true; // Default to provisioned (skip setup mode)
}

async function checkKeycloakRealm(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/auth/realms/admin', { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function setupTokenRefresh(): void {
  if (_tokenUpdateInterval) {
    clearInterval(_tokenUpdateInterval);
  }
  
  _tokenUpdateInterval = setInterval(() => {
    keycloak.updateToken(30) // 30초 전에 갱신
      .then((refreshed) => {
        if (refreshed) {
          _token = keycloak.token || null;
          console.log('Token refreshed');
        }
      })
      .catch(() => {
        console.warn('Token refresh failed');
        // 갱신 실패 시 로그아웃
        logout();
      });
  }, 60000); // 1분마다 체크
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
  
  // 직접 로그아웃 URL 구성 — keycloak-js 내부 로직 우회
  const logoutUrl = `${keycloak.authServerUrl}/realms/${keycloak.realm}/protocol/openid-connect/logout`
    + `?client_id=${keycloak.clientId}`
    + `&post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
  
  keycloak.clearToken();
  window.location.href = logoutUrl;
}

export async function initAuth(): Promise<AuthState> {
  // Check provisioning
  const provisioned = await checkProvisionState();
  if (!provisioned) {
    _initialized = true;
    _skipAuth = true;
    return buildState();
  }

  // Check if Keycloak realm exists
  const realmOk = await checkKeycloakRealm();
  if (!realmOk) {
    _initialized = true;
    _skipAuth = true;
    return buildState();
  }

  // Initialize Keycloak with PKCE
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
    });

    if (authenticated) {
      _token = keycloak.token || null;
      _username = keycloak.tokenParsed?.preferred_username || 'unknown';
      _displayName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.given_name || '';
      _email = keycloak.tokenParsed?.email || '';
      
      // Update global store
      useAppStore.getState().setUsername(_username);
      
      // Setup token refresh
      setupTokenRefresh();
      
      console.log('Keycloak authentication successful:', _username);
    }
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    _initialized = true;
    _skipAuth = true; // fallback to skip mode
    return buildState();
  }

  _initialized = true;
  return buildState();
}

function buildState(): AuthState {
  return {
    initialized: _initialized,
    authenticated: _skipAuth || _token !== null,
    username: _username,
    displayName: _displayName,
    email: _email,
    token: _token,
    skipAuth: _skipAuth,
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