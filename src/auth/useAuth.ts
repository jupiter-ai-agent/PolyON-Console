/**
 * PolyON Auth — Keycloak OIDC stub
 * Phase 1: 간단한 stub. Phase 2에서 keycloak-js 연동 예정.
 */
import { useState, useEffect } from 'react';
import { setTokenProvider } from '../api/client';

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

  // TODO: Phase 2 — integrate keycloak-js
  // For now, mark as authenticated with placeholder
  _initialized = true;
  _skipAuth = false;
  _username = 'admin';
  _token = null; // will be set by keycloak

  return buildState();
}

function buildState(): AuthState {
  return {
    initialized: _initialized,
    authenticated: _skipAuth || _token !== null,
    username: _username,
    token: _token,
    skipAuth: _skipAuth,
    logout: () => {
      _token = null;
      _username = '';
      window.location.href = '/auth/realms/admin/protocol/openid-connect/logout';
    },
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
