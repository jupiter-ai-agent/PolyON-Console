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
  token: string | null;
  skipAuth: boolean;
  logout: () => void;
}

let _token: string | null = null;
let _username = '';
let _initialized = false;
let _skipAuth = false;
let _tokenUpdateInterval: number | null = null;

// Token provider registration (for API client)
setTokenProvider(() => _token);

async function checkProvisionState(): Promise<boolean> {
  try {
    const res = await fetch('/api/sentinel/state');
    if (res.ok) {
      const status = (await res.json()) as Record<string, unknown>;
      return status['provisioned'] === true || status['state'] === 'running';
    }
  } catch {
    // ignore
  }
  return false;
}

async function checkKeycloakRealm(): Promise<boolean> {
  try {
    const res = await fetch('/auth/realms/admin');
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
  useAppStore.getState().setUsername('');
  
  if (!_skipAuth) {
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  }
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