import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { fetchMe, login as loginRequest, refreshAccessToken, setPublicKey } from "../api/auth";
import { setAccessToken, setRefreshHandler } from "../api/client";
import { getOrCreateIdentityKeyPair } from "../crypto";
import {
  disableBiometric,
  enableBiometric,
  getMeta,
  isPinSet,
  rotateStoredRefresh,
  setupPin,
  unlockWithPin,
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

  // Admin loja/dərəcəni dəyişə bilər — profil ekranı açılanda təzələnir.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await fetchMe();
      setUser(data);
    } catch {
      /* offline / token yoxdur — köhnə məlumat qalsın */
    }
  }, []);

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

  // Parametrlər → Təhlükəsizlik: PIN-i dəyiş (cari PIN yoxlanılır).
  async function changePin(currentPin, newPin) {
    const res = await unlockWithPin(currentPin);
    if (!res.ok) return false;
    const meta = await getMeta();
    await setupPin(newPin, res.refreshToken);
    if (meta.biometricEnabled) await enableBiometric(res.refreshToken);
    pinRef.current = newPin;
    return true;
  }

  // Parametrlər → Təhlükəsizlik: biometrikanı aç/bağla.
  async function setBiometricEnabled(enabled) {
    if (enabled) {
      if (!refreshRef.current) return false;
      return enableBiometric(refreshRef.current);
    }
    await disableBiometric();
    return true;
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
        refreshUser,
        completePinSetup,
        persistRotatedRefresh,
        setBiometricEnabled,
        changePin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
