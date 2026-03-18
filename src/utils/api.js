// src/utils/api.js
// FIXES:
//  1. Base URL always has https:// (ERR_NAME_NOT_RESOLVED fix)
//  2. 401 handling is smarter — only redirects on actual auth failures,
//     not on network errors or Render cold-start timeouts
//  3. Adds retry logic for network errors (Render free tier cold starts)
//  4. Adds ?reason=session_expired only for genuine expired token 401s
//  5. Prevents redirect loops (won't redirect if already on /login)

import axios from 'axios';

// ── Safe base URL builder ──────────────────────────────────────────────────────
const buildBaseURL = () => {
  const raw = process.env.REACT_APP_API_URL || 'https://descrow-backend-5ykg.onrender.com/api';
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '');
  return `https://${raw.replace(/\/$/, '')}`;
};

const BASE_URL = buildBaseURL();

// Always log base URL so you can confirm it in production DevTools console too
console.log('API Base URL:', BASE_URL);

// ── Axios instance ─────────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — Render free tier can take 30-50s to cold start
  headers: { 'Content-Type': 'application/json' }
});

// ── Track in-flight redirect to prevent multiple simultaneous 401s
// all triggering redirects at once
let isRedirectingToLogin = false;

// ── Request interceptor — attach auth token ───────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status        = error.response?.status;
    const url           = error.config?.url || '';
    const isAuthRoute   = window.location.pathname === '/login' ||
                          window.location.pathname === '/signup' ||
                          window.location.pathname === '/forgot-password' ||
                          window.location.pathname.startsWith('/reset-password') ||
                          window.location.pathname.startsWith('/verify-email');

    // ── Network error / timeout — could be Render cold start ─────────────────
    // Retry once after 3 seconds before treating as a real failure
    if (!error.response && error.config && !error.config.__retried) {
      console.warn('API network error — backend may be waking up. Retrying in 3s...', url);
      error.config.__retried = true;
      await new Promise(resolve => setTimeout(resolve, 3000));
      return API(error.config);
    }

    // ── 401 Unauthorized ──────────────────────────────────────────────────────
    if (status === 401 && !isAuthRoute && !isRedirectingToLogin) {
      // Only redirect if this is NOT a login/2fa attempt itself
      // (those 401s should be handled by the calling code as wrong credentials)
      const isLoginAttempt = url.includes('/auth/login') ||
                             url.includes('/auth/2fa/verify-login') ||
                             url.includes('/auth/google');

      if (!isLoginAttempt) {
        isRedirectingToLogin = true;
        console.warn('Session expired — redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Small delay so any other in-flight requests can settle
        setTimeout(() => {
          window.location.href = '/login?reason=session_expired';
          isRedirectingToLogin = false;
        }, 100);
      }
    }

    // ── 403 Forbidden ─────────────────────────────────────────────────────────
    if (status === 403) {
      console.warn('Access forbidden:', url);
    }

    // ── 500 Server error ──────────────────────────────────────────────────────
    if (status >= 500) {
      console.error(`Server error ${status}:`, url, error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

export default API;
