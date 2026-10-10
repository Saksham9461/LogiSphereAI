import axios from 'axios';
import { BASE_URL } from './apiPath';
import { tokenStorage } from '../services/storage/tokenStorage';

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use(async config => {
  const token = await tokenStorage.getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    if (status === 401) {
      console.warn('API auth error (401): unauthorized token or session expired');
      const isLoginRequest = error?.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        try {
          // Lazily resolve AuthStore to avoid circular dependency
          const useAuthStore = require('../store/AuthStore').default;
          if (useAuthStore?.getState) {
            useAuthStore.getState().logout();
          }
        } catch {
          // safely ignored
        }
      }
    } else if (status === 403) {
      console.warn('API auth error (403): forbidden');
    }
    return Promise.reject(error);
  },
);

export default client;
