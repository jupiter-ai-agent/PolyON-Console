/**
 * Keycloak 인스턴스 싱글턴
 */
import Keycloak from 'keycloak-js';

// Keycloak 설정 상수
const KEYCLOAK_CONFIG = {
  url: 'https://auth.cmars.com',   // Keycloak 26.x: /auth prefix 없음
  realm: 'admin',
  clientId: 'polyon-console',
} as const;

const keycloak = new Keycloak(KEYCLOAK_CONFIG);

export default keycloak;