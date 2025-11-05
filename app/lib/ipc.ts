import type { Api } from '../electron/preload';

declare global {
  interface Window {
    api: Api;
  }
}

export const api = typeof window !== 'undefined' ? window.api : null;

