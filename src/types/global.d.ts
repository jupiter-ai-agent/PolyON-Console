/**
 * PolyON 글로벌 타입 정의
 */

import type { ComponentType } from 'react';

declare const __CONSOLE_VERSION__: string;

declare global {
  interface Window {
    __POLYON__: {
      React: typeof React;
      ReactDOM: typeof ReactDOM;
      ReactRouterDOM: typeof import('react-router-dom');
      CarbonReact: typeof import('@carbon/react');
      CarbonIcons: typeof import('@carbon/icons-react');
      sdk: {
        apiFetch: typeof import('../api/client').apiFetch;
        useAuth: typeof import('../auth/useAuth').useAuth;
        PageHeader: ComponentType<any>;
      };
      version: {
        sdk: string;
        react: string;
        carbon: string;
      };
    };
  }
}

export {};