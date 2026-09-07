import axios from "axios";

import { API_BASE_URL } from "../config";

// Access token yalnız yaddaşda saxlanılır — diskə yazılmır. Refresh token
// secureLock.js tərəfindən PIN ilə şifrələnib SecureStore-da saxlanılır.
let accessToken = null;
let refreshHandler = null; // async () => newAccessToken | null

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

// AuthContext qeyd edir: 401 alanda refresh token ilə yeni access almağa cəhd.
export function setRefreshHandler(fn) {
  refreshHandler = fn;
}

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && refreshHandler && original && !original._retried) {
      original._retried = true;
      try {
        refreshing = refreshing || refreshHandler();
        const newToken = await refreshing;
        refreshing = null;
        if (newToken) {
          accessToken = newToken;
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        }
      } catch {
        refreshing = null;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
