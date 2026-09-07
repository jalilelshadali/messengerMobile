import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { fetchMe, login as loginRequest, refreshAccessToken, setPublicKey } from "../api/auth";
import { setAccessToken, setRefreshHandler } from "../api/client";
import { getOrCreateIdentityKeyPair } from "../crypto";
import {
  enableBiometric,
  isPinSet,
  rotateStoredRefresh,
  setupPin,
  wipeLock,
} from "../lib/secureLock";
import { registerForPushNotifications } from "../notifications";

const AuthContext = createContext(null);

async function ensurePublicKeyUploaded(currentUser) {
  try {
    const { publicKey } = await getOrCreateIdentityKeyPair();
    if (currentUser.public_key !== publicKey) {
      await setPublicKey(publicKey);
    }
  } catch {
    // Non-fatal: birbaşa mesajlar növbəti uğurlu login-ə qədər açılmaya bilər.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // "locked": PIN qurulub, kilid ekranı göstərilməlidir.
  const [locked, setLocked] = useState(false);
  // "needsPinSetup": indicə parolla giriş oldu, PIN hələ qurulmayıb.
  const [needsPinSetup, setNeedsPinSetup] = useState(false);

  const refreshRef = useRef(null); // yaddaşdakı cari refresh token
  const pinRef = useRef(null); // rotasiya üçün cari PIN (yalnız yaddaşda, sessiya boyu)

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 401 → refresh token ilə yeni access almağa cəhd. Alınmasa → kilidlə.
  useEffect(() => {
    setRefreshHandler(async () => {
      if (!refreshRef.current) return null;
      try {
        const { data } = await refreshAccessToken(refreshRef.current);
        setAccessToken(data.access);
        return data.access;
      } catch {
        setLocked(true);
        return null;
      }
    });
  }, []);

  async function restoreSession() {
    try {
      if (await isPinSet()) {
        // Sessiya var (şifrəli), amma kilidlidir — PIN ekranı açılacaq.
        setLocked(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // 1) Parolla giriş — refresh tokeni yaddaşda saxlayır, PIN qurmağı gözləyir.
  async function login(username, password) {
    const { data } = await loginRequest({ username, password });
    setAccessToken(data.access);
    refreshRef.current = data.refresh;
    const me = await fetchMe();
    setUser(me.data);
    setNeedsPinSetup(true);
  }

  // 2) PIN qurma axınının sonu.
  async function completePinSetup(pin, wantBiometric) {
    await setupPin(pin, refreshRef.current);
    if (wantBiometric) await enableBiometric(refreshRef.current);
    pinRef.current = pin;
    setNeedsPinSetup(false);
    setLocked(false);
    registerForPushNotifications();
    if (user) ensurePublicKeyUploaded(user);
  }

  // 3) Kilid açma — PIN/biometrika ekranından gələn refresh token ilə.
  async function unlock(refreshToken, pin) {
    refreshRef.current = refreshToken;
    if (pin) pinRef.current = pin;
    const { data } = await refreshAccessToken(refreshToken);
    setAccessToken(data.access);
    let me = user;
    if (!me) {
      const res = await fetchMe();
      me = res.data;
      setUser(me);
    }
    setLocked(false);
    registerForPushNotifications();
    if (me) ensurePublicKeyUploaded(me);
  }

  // App arxa plandan qayıdıб 60s+ keçibsə çağırılır.
  const lockNow = useCallback(() => {
    setAccessToken(null);
    setLocked(true);
  }, []);

  async function logout() {
    await wipeLock();
    setAccessToken(null);
    refreshRef.current = null;
    pinRef.current = null;
    setUser(null);
    setLocked(false);
    setNeedsPinSetup(false);
  }

  // Refresh token rotasiya olunanda saxlanılan (şifrəli) nüsxəni yenilə.
  async function persistRotatedRefresh(newRefresh) {
    refreshRef.current = newRefresh;
    if (pinRef.current) await rotateStoredRefresh(pinRef.current, newRefresh);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        locked,
        needsPinSetup,
        login,
        logout,
        unlock,
        lockNow,
        completePinSetup,
        persistRotatedRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
