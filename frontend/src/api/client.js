import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

/** Called on 401 from API (e.g. expired token). Replace with logout from AuthProvider. */
let unauthorizedHandler = () => {};

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : () => {};
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !error.config?.skipAuthRedirect) {
      const path = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
      const isLoginOrRegister =
        /\/auth\/login\b/i.test(path) ||
        /\/auth\/register\b/i.test(path) ||
        (error.config?.url || '').includes('auth/login') ||
        (error.config?.url || '').includes('auth/register');
      if (!isLoginOrRegister) {
        unauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);
