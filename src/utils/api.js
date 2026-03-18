// src/utils/api.js
// FIX: Ensures API base URL always has https:// protocol prefix.
// ERR_NAME_NOT_RESOLVED was caused by the URL being constructed as
// "descrow-backend-5ykg.onrender.com/api/..." (no protocol) so the
// browser tried to resolve it as a relative path / bare hostname.

import axios from 'axios';

// ── Safe base URL builder ─────────────────────────────────────────────────────
// Reads from REACT_APP_API_URL env var, falls back to the production backend.
// Guarantees the result always starts with https:// or http://.
const buildBaseURL = () => {
  const raw = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';

  // Already has a protocol — use as-is
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');

  // Bare hostname or hostname/path — prepend https://
  return `https://${raw.replace(/\/$/, '')}`;
};

const BASE_URL = buildBaseURL();

// Log in development so you can confirm the URL looks right
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', BASE_URL);
}

// ── Axios instance ────────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Request interceptor — attach auth token ───────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 globally ───────────────────────────────
API.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      const isAuthRoute = window.location.pathname.startsWith('/login') ||
                          window.location.pathname.startsWith('/signup');
      if (!isAuthRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
