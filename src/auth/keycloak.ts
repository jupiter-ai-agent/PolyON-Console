/**
 * Keycloak 인스턴스 — 런타임 설정 (하드코딩 제거)
 */
import Keycloak from 'keycloak-js';

let keycloak: Keycloak | null = null;

export interface AuthConfig {
  keycloak_url: string;
  realm: string;
  client_id: string;
}

/**
 * Core API에서 Keycloak 설정을 조회하여 인스턴스 생성.
 * 실패 시 null 반환 — 호출측에서 에러 처리 필수.
 */
export async function initKeycloak(): Promise<Keycloak> {
  if (keycloak) return keycloak;

  const res = await fetch('/api/v1/system/auth-config');
  if (!res.ok) {
    throw new Error(`auth-config API 응답 실패: ${res.status}`);
  }

  const data: AuthConfig = await res.json();

  if (!data.keycloak_url) {
    throw new Error('Keycloak URL이 설정되지 않았습니다. Operator 설치를 확인하세요.');
  }

  keycloak = new Keycloak({
    url: data.keycloak_url,
    realm: data.realm || 'admin',
    clientId: data.client_id || 'polyon-console',
  });

  return keycloak;
}

export function getKeycloak(): Keycloak | null {
  return keycloak;
}

export default keycloak;
