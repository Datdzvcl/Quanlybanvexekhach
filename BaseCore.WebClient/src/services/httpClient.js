import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';
export const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE || 'http://localhost:5002';
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE || AUTH_API_BASE;

export const TOKEN_STORAGE_KEY = 'token';
export const USER_STORAGE_KEY = 'user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function attachAuthToken(config) {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

function handleError(error) {
  if (error.response?.status === 401) {
    clearStoredAuth();
  }

  const data = error.response?.data;
  const message =
    data?.message ||
    data?.title ||
    (typeof data === 'string' ? data : null) ||
    error.message ||
    'Request failed';

  return Promise.reject(new Error(`${message}${error.response?.status ? ` (${error.response.status})` : ''}`));
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const authClient = axios.create({
  baseURL: AUTH_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(attachAuthToken);
authClient.interceptors.request.use(attachAuthToken);

apiClient.interceptors.response.use((response) => response, handleError);
authClient.interceptors.response.use((response) => response, handleError);

export function clientForPath(path) {
  return path.startsWith('/api/auth') ? authClient : apiClient;
}
