/**
 * API and WebSocket URL configuration utility.
 * Supports configurable VITE_API_BASE_URL for production deployments (e.g. Render)
 * while preserving relative paths for local development and proxied setups.
 */

export function getApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

export function getWsBase() {
  const apiBase = getApiBase();
  if (apiBase) {
    if (apiBase.startsWith('https://')) {
      return apiBase.replace(/^https:\/\//i, 'wss://');
    }
    if (apiBase.startsWith('http://')) {
      return apiBase.replace(/^http:\/\//i, 'ws://');
    }
    // Fallback if protocol was omitted
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${apiBase.replace(/^\/+/, '')}`;
  }

  if (typeof window === 'undefined') return 'ws://localhost:5177';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}
