// Lokal "app lock" — bank applərindəki kimi PIN + biometrika.
//
// Nə edir:
//  - Login-dən sonra refresh token cihazın SecureStore-una yazılır, amma
//    PIN-dən törədilən açarla ŞİFRƏLƏNMİŞ şəkildə. PIN-siz açılmır.
//  - Biometrika seçilibsə, refresh token ayrıca "requireAuthentication" ilə
//    də saxlanılır (Keychain/Keystore özü Face ID / barmaq izi soruşur).
//  - Server PIN-i və biometrikanı GÖRMÜR — bu tam lokal qatdır.
//
// Qeyd: PIN 6 rəqəmlidir və əsas müdafiə deyil (cihazın secure enclave-idir).
// İterasiyalı hash yalnız brute-force-u yavaşladır.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";

const K = {
  salt: "lock.salt",
  verifier: "lock.verifier",
  wrappedRefresh: "lock.refresh",
  bioRefresh: "lock.bio_refresh",
  meta: "lock.meta", // AsyncStorage: { biometricEnabled }
  state: "lock.state", // AsyncStorage: { failedAttempts, lockedUntil }
};

const ITERATIONS = 12000;
const BIO_SERVICE = "lojamessenger.biometric";
const MAX_ATTEMPTS = 5;
const LOCKOUT_AFTER = 3;
const LOCKOUT_MS = 60_000;

// expo-secure-store native-only; web-də fallback (E2EE üçün onsuz da zəif).
const nativeSecure = Platform.OS !== "web";
async function secureGet(key, opts) {
  if (!nativeSecure) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key, opts);
}
async function secureSet(key, value, opts) {
  if (!nativeSecure) return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value, opts);
}
async function secureDelete(key, opts) {
  if (!nativeSecure) return AsyncStorage.removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key, opts);
  } catch {
    /* yoxdursa problem deyil */
  }
}

function deriveBytes(pin, saltB64, domain) {
  const prefix = decodeUTF8(`${domain}:${pin}:`);
  const salt = decodeBase64(saltB64);
  const seed = new Uint8Array(prefix.length + salt.length);
  seed.set(prefix);
  seed.set(salt, prefix.length);
  let out = nacl.hash(seed); // 64 bayt (SHA-512)
  for (let i = 0; i < ITERATIONS; i += 1) out = nacl.hash(out);
  return out;
}

function wrap(plaintext, keyBytes32) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(decodeUTF8(plaintext), nonce, keyBytes32);
  return `${encodeBase64(nonce)}:${encodeBase64(box)}`;
}
function unwrap(packed, keyBytes32) {
  const [nonceB64, boxB64] = String(packed).split(":");
  const opened = nacl.secretbox.open(decodeBase64(boxB64), decodeBase64(nonceB64), keyBytes32);
  return opened ? encodeUTF8(opened) : null;
}

// ---- State (cəhd sayğacı / bloklanma) ----

export async function getLockState() {
  try {
    const raw = await AsyncStorage.getItem(K.state);
    const s = raw ? JSON.parse(raw) : {};
    return { failedAttempts: s.failedAttempts || 0, lockedUntil: s.lockedUntil || 0 };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}
async function setLockState(s) {
  await AsyncStorage.setItem(K.state, JSON.stringify(s));
}
async function resetLockState() {
  await AsyncStorage.removeItem(K.state);
}

// ---- Setup / status ----

export async function isPinSet() {
  return Boolean(await secureGet(K.verifier));
}

export async function getMeta() {
  try {
    const raw = await AsyncStorage.getItem(K.meta);
    return raw ? JSON.parse(raw) : { biometricEnabled: false };
  } catch {
    return { biometricEnabled: false };
  }
}

export async function biometricAvailable() {
  if (!nativeSecure) return false;
  try {
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hw && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricLabel() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Üz ilə";
    }
    return Platform.OS === "ios" ? "Touch ID" : "Barmaq izi";
  } catch {
    return "Biometrika";
  }
}

// PIN ilk dəfə qurulur (login-dən dərhal sonra). refreshToken login cavabından.
export async function setupPin(pin, refreshToken) {
  const saltBytes = nacl.randomBytes(16);
  const saltB64 = encodeBase64(saltBytes);
  const verifier = encodeBase64(deriveBytes(pin, saltB64, "verify"));
  const wrapKey = deriveBytes(pin, saltB64, "wrap").slice(0, 32);

  await secureSet(K.salt, saltB64);
  await secureSet(K.verifier, verifier);
  await secureSet(K.wrappedRefresh, wrap(refreshToken, wrapKey));
  await AsyncStorage.setItem(K.meta, JSON.stringify({ biometricEnabled: false }));
  await resetLockState();
}

// PIN qurma axınının son addımı: biometrikanı da aktiv et.
export async function enableBiometric(refreshToken) {
  if (!(await biometricAvailable())) return false;
  try {
    await secureSet(K.bioRefresh, refreshToken, {
      keychainService: BIO_SERVICE,
      requireAuthentication: true,
    });
    await AsyncStorage.setItem(K.meta, JSON.stringify({ biometricEnabled: true }));
    return true;
  } catch {
    return false;
  }
}

export async function disableBiometric() {
  await secureDelete(K.bioRefresh, { keychainService: BIO_SERVICE });
  const meta = await getMeta();
  await AsyncStorage.setItem(K.meta, JSON.stringify({ ...meta, biometricEnabled: false }));
}

// ---- Unlock ----

// Nəticə: { ok, refreshToken } | { ok:false, reason, attemptsLeft, lockedUntil }
export async function unlockWithPin(pin) {
  const state = await getLockState();
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return { ok: false, reason: "locked", lockedUntil: state.lockedUntil };
  }

  const saltB64 = await secureGet(K.salt);
  const verifier = await secureGet(K.verifier);
  if (!saltB64 || !verifier) return { ok: false, reason: "not_set" };

  const candidate = encodeBase64(deriveBytes(pin, saltB64, "verify"));
  if (candidate !== verifier) {
    const failedAttempts = state.failedAttempts + 1;
    if (failedAttempts >= MAX_ATTEMPTS) {
      await wipeLock();
      return { ok: false, reason: "wiped" };
    }
    const lockedUntil =
      failedAttempts >= LOCKOUT_AFTER ? Date.now() + LOCKOUT_MS : 0;
    await setLockState({ failedAttempts, lockedUntil });
    return {
      ok: false,
      reason: "wrong",
      attemptsLeft: MAX_ATTEMPTS - failedAttempts,
      lockedUntil,
    };
  }

  const wrapKey = deriveBytes(pin, saltB64, "wrap").slice(0, 32);
  const refreshToken = unwrap(await secureGet(K.wrappedRefresh), wrapKey);
  if (!refreshToken) return { ok: false, reason: "corrupt" };

  await resetLockState();
  return { ok: true, refreshToken };
}

// Nəticə: { ok, refreshToken } | { ok:false, reason }
export async function unlockWithBiometric() {
  if (!nativeSecure) return { ok: false, reason: "unavailable" };
  const meta = await getMeta();
  if (!meta.biometricEnabled) return { ok: false, reason: "disabled" };
  try {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: "Kilidi aç",
      cancelLabel: "Ləğv et",
      disableDeviceFallback: false,
    });
    if (!auth.success) return { ok: false, reason: "cancelled" };
    const refreshToken = await secureGet(K.bioRefresh, {
      keychainService: BIO_SERVICE,
      requireAuthentication: true,
    });
    if (!refreshToken) return { ok: false, reason: "missing" };
    await resetLockState();
    return { ok: true, refreshToken };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Refresh token dəyişəndə (yeni login / rotasiya) saxlanılanları yenilə.
export async function rotateStoredRefresh(pin, refreshToken) {
  const saltB64 = await secureGet(K.salt);
  if (!saltB64) return;
  const wrapKey = deriveBytes(pin, saltB64, "wrap").slice(0, 32);
  await secureSet(K.wrappedRefresh, wrap(refreshToken, wrapKey));
  const meta = await getMeta();
  if (meta.biometricEnabled) {
    await secureSet(K.bioRefresh, refreshToken, {
      keychainService: BIO_SERVICE,
      requireAuthentication: true,
    });
  }
}

// 5 səhv PIN və ya çıxış: hər şeyi sil (identity açarı YOX — o crypto.js-dədir).
export async function wipeLock() {
  await secureDelete(K.salt);
  await secureDelete(K.verifier);
  await secureDelete(K.wrappedRefresh);
  await secureDelete(K.bioRefresh, { keychainService: BIO_SERVICE });
  await AsyncStorage.multiRemove([K.meta, K.state]);
}
