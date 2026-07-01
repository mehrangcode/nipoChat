import axios from 'axios';

const TOKEN_KEY = 'nipo.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Same-origin during dev (Vite proxy forwards /api to the backend).
export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token invalid/expired — clear it so the app redirects to login.
      setToken(null);
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err: unknown, fallback = 'خطایی رخ داد.'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string })?.error ?? err.message ?? fallback;
  }
  return fallback;
}
