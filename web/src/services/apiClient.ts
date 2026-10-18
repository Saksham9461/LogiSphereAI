// ==============================================================================
// LogiSphere AI — Centralized Web API Client
// Connects to Express backend using VITE_API_BASE_URL (Never hardcoded)
// ==============================================================================

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

/**
 * Resolves the backend API base URL from Vite environment variables.
 * Falls back to http://localhost:5001 if not explicitly configured.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:5001';
}

/**
 * Resolves the WebSocket base URL derived from the API base URL or VITE_WS_URL.
 */
export function getWsBaseUrl(): string {
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && typeof envWs === 'string' && envWs.trim().length > 0) {
    return envWs.trim().replace(/\/+$/, '');
  }
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/^http(s?):/, 'ws$1:');
}

/**
 * Centralized Axios client configured with credentials, multi-tenant headers,
 * and authentication interceptors.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT and Multi-Organization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Session Token (supports adminToken and standard token)
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('adminToken') || localStorage.getItem('token')
        : null;
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Multi-Organization SaaS Tenant Context
    // Only attach X-Organization-Id if an active organization session is explicitly established
    const orgId =
      typeof localStorage !== 'undefined' ? localStorage.getItem('organizationId') : null;

    if (orgId && config.headers) {
      config.headers['X-Organization-Id'] = orgId;
    }

    return config;
  },
  error => Promise.reject(error)
);

// Response Interceptor: Normalized error extraction
apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Network request failed';

    if (status === 401) {
      // Session expired or invalid token
      console.warn('[Web API] Unauthorized request (401). Clearing session tokens.');
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
      }
    } else if (status === 403) {
      console.warn('[Web API] Forbidden request (403):', message);
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
