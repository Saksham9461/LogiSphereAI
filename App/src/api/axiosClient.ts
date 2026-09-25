import axios from 'axios';
import {BASE_URL} from './apiPath';
import {tokenStorage} from '../services/storage/tokenStorage';

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
    if (status === 401 || status === 403) {
      console.warn('API auth error', status, error?.response?.data || error?.message);
    }
    return Promise.reject(error);
  },
);

export default client;
