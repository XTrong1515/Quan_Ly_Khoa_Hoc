import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ── In-memory token (set by auth store after login/rehydrate) ──
let _token = null;
let _onLogout = () => {};

export function setToken(t) { _token = t; }
export function registerLogout(fn) { _onLogout = fn; }

// Read refresh token from persisted store (always in sync with localStorage)
function getRefreshToken() {
  try {
    return JSON.parse(localStorage.getItem('hoisted.auth') ?? '{}')?.state?.refreshToken ?? null;
  } catch { return null; }
}

// ── Axios instance ────────────────────────────────────────────
export const api = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

// Inject access token on every request
api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

// 401 → try refresh once, then retry original request
let _refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (!_refreshPromise) {
      _refreshPromise = axios
        .post(`${BASE_URL}/api/auth/refresh`, { refreshToken: getRefreshToken() })
        .then(({ data }) => {
          setToken(data.accessToken);
          // Patch localStorage so Zustand persist stays consistent across tabs
          try {
            const stored = JSON.parse(localStorage.getItem('hoisted.auth') ?? '{}');
            if (stored.state) stored.state.token = data.accessToken;
            localStorage.setItem('hoisted.auth', JSON.stringify(stored));
          } catch { /* ignore */ }
          return data.accessToken;
        })
        .catch((err) => { _onLogout(); throw err; })
        .finally(() => { _refreshPromise = null; });
    }

    try {
      const newToken = await _refreshPromise;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      return Promise.reject(error);
    }
  },
);

// ── Helper: pull readable message out of any axios error ──────
export function apiMessage(err, fallback = 'Đã có lỗi xảy ra') {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}
