import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

import { fetchMe, login as loginRequest, setPublicKey } from "../api/auth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../api/client";
import { getOrCreateIdentityKeyPair } from "../crypto";
import { registerForPushNotifications } from "../notifications";

const AuthContext = createContext(null);

async function ensurePublicKeyUploaded(currentUser) {
  try {
    const { publicKey } = await getOrCreateIdentityKeyPair();
    if (currentUser.public_key !== publicKey) {
      await setPublicKey(publicKey);
    }
  } catch {
    // Non-fatal: worst case, direct messages to/from this device won't
    // decrypt until the key successfully uploads on a later login.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      try {
        const { data } = await fetchMe();
        setUser(data);
        registerForPushNotifications();
        ensurePublicKeyUploaded(data);
      } catch {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      }
    }
    setIsLoading(false);
  }

  async function login(username, password) {
    const { data } = await loginRequest({ username, password });
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    const me = await fetchMe();
    setUser(me.data);
    registerForPushNotifications();
    ensurePublicKeyUploaded(me.data);
  }

  async function logout() {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
