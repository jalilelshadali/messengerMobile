import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  biometricAvailable,
  getBiometricLabel,
  getLockState,
  unlockWithBiometric,
  unlockWithPin,
} from "../lib/secureLock";
import { useTheme } from "../theme";

const PIN_LENGTH = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];

export default function PinScreen({ mode = "unlock", onDone }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user, unlock, completePinSetup, changePin, logout } = useAuth();

  // setup: create->confirm->biometric; unlock: enter; change: verify->create->confirm
  const [stage, setStage] = useState(
    mode === "setup" ? "create" : mode === "change" ? "verify" : "enter"
  );
  const [digits, setDigits] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [bioReady, setBioReady] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometrika");

  const shake = useRef(new Animated.Value(0)).current;
  const dotScales = useRef([...Array(PIN_LENGTH)].map(() => new Animated.Value(1))).current;

  const remainingLock = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isLocked = remainingLock > 0;

  useEffect(() => {
    biometricAvailable().then(setBioReady);
    getBiometricLabel().then(setBioLabel);
    if (mode === "unlock") {
      getLockState().then((s) => s.lockedUntil && setLockedUntil(s.lockedUntil));
    }
  }, [mode]);

  // Lockout geri sayımı.
  useEffect(() => {
    if (!isLocked) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isLocked]);

  // Kilid ekranı açılanda biometrikanı bir dəfə avtomatik soruş.
  const autoPrompted = useRef(false);
  useEffect(() => {
    if (mode === "unlock" && stage === "enter" && bioReady && !autoPrompted.current) {
      autoPrompted.current = true;
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stage, bioReady]);

  function bump(index) {
    Animated.sequence([
      Animated.timing(dotScales[index], { toValue: 1.25, duration: 60, useNativeDriver: true }),
      Animated.timing(dotScales[index], { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function doShake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  const title = useMemo(() => {
    if (mode === "setup") {
      if (stage === "create") return "PIN yaradın";
      if (stage === "confirm") return "PIN-i təkrarlayın";
      return `${bioLabel} ilə də açılsın?`;
    }
    if (mode === "change") {
      if (stage === "verify") return "Cari PIN-i daxil edin";
      if (stage === "create") return "Yeni PIN";
      return "Yeni PIN-i təkrarlayın";
    }
    const name = user?.first_name || user?.username;
    return name ? `Xoş gördük, ${name}` : "Xoş gördük";
  }, [mode, stage, bioLabel, user]);

  const subtitle = useMemo(() => {
    if (error) return error;
    if (stage === "create") return "Tətbiqə hər girişdə bu PIN soruşulacaq";
    if (stage === "confirm") return "Eyni 6 rəqəmi bir daha daxil edin";
    if (isLocked) return `Çox səhv cəhd · ${remainingLock}s gözləyin`;
    return "PIN daxil edin";
  }, [error, stage, isLocked, remainingLock]);

  async function onComplete(pin) {
    if (mode === "change") {
      if (stage === "verify") {
        setBusy(true);
        try {
          const res = await unlockWithPin(pin);
          if (res.ok) {
            setCurrentPin(pin);
            setDigits("");
            setStage("create");
            setError("");
          } else {
            setDigits("");
            setError(res.reason === "wiped" ? "PIN sıfırlandı" : "PIN səhvdir");
            doShake();
            if (res.reason === "wiped") await logout();
          }
        } finally {
          setBusy(false);
        }
        return;
      }
      if (stage === "create") {
        setFirstPin(pin);
        setDigits("");
        setStage("confirm");
        return;
      }
      // confirm
      if (pin !== firstPin) {
        setError("PIN-lər uyğun gəlmədi");
        doShake();
        setDigits("");
        setStage("create");
        setFirstPin("");
        return;
      }
      setBusy(true);
      const ok = await changePin(currentPin, pin);
      setBusy(false);
      if (ok) onDone?.();
      else {
        setError("PIN dəyişdirilə bilmədi");
        doShake();
        setDigits("");
      }
      return;
    }

    if (mode === "setup") {
      if (stage === "create") {
        setFirstPin(pin);
        setDigits("");
        setStage("confirm");
        return;
      }
      // confirm
      if (pin !== firstPin) {
        setError("PIN-lər uyğun gəlmədi");
        doShake();
        setDigits("");
        setStage("create");
        setFirstPin("");
        return;
      }
      setError("");
      if (bioReady) {
        setStage("biometric");
      } else {
        setBusy(true);
        await completePinSetup(pin, false);
      }
      return;
    }

    // unlock
    setBusy(true);
    try {
      const res = await unlockWithPin(pin);
      if (res.ok) {
        await unlock(res.refreshToken, pin);
        return;
      }
      setDigits("");
      if (res.reason === "wiped") {
        await logout();
        return;
      }
      if (res.reason === "locked") {
        setLockedUntil(res.lockedUntil);
        setError("");
      } else if (res.reason === "wrong") {
        if (res.lockedUntil) setLockedUntil(res.lockedUntil);
        setError(
          res.attemptsLeft > 0
            ? `PIN səhvdir · ${res.attemptsLeft} cəhd qaldı`
            : "PIN səhvdir"
        );
        doShake();
      } else {
        setError("PIN yoxlanıla bilmədi");
        doShake();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleBiometric() {
    if (busy || isLocked) return;
    setBusy(true);
    try {
      const res = await unlockWithBiometric();
      if (res.ok) await unlock(res.refreshToken);
    } finally {
      setBusy(false);
    }
  }

  function press(key) {
    if (busy || isLocked) return;
    if (key === "bio") {
      if (mode === "unlock" && bioReady) handleBiometric();
      return;
    }
    if (key === "del") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      if (d.length >= PIN_LENGTH) return d;
      const next = d + key;
      bump(next.length - 1);
      Haptics.selectionAsync().catch(() => {});
      if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120);
      return next;
    });
  }

  async function finishBiometricStage(wantBio) {
    setBusy(true);
    await completePinSetup(firstPin, wantBio);
  }

  const initials = (user?.first_name?.[0] || user?.username?.[0] || "?").toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: t.color.bg, paddingTop: insets.top + t.spacing.xl }]}>
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: t.color.surfaceAlt }]}>
          <Text style={[t.typography.title, { color: t.color.textPrimary }]}>{initials}</Text>
        </View>
        <Text style={[t.typography.title, styles.title, { color: t.color.textPrimary }]}>{title}</Text>
        <Text
          style={[
            t.typography.caption,
            styles.subtitle,
            { color: error ? t.color.danger : t.color.textSecondary },
          ]}
        >
          {subtitle}
        </Text>

        {stage !== "biometric" && (
          <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
            {[...Array(PIN_LENGTH)].map((_, i) => {
              const filled = i < digits.length;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      transform: [{ scale: dotScales[i] }],
                      backgroundColor: error
                        ? t.color.danger
                        : filled
                          ? t.color.accent
                          : t.color.surfaceAlt,
                      borderColor: error ? t.color.danger : t.color.border,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>
        )}
      </View>

      {stage === "biometric" ? (
        <View style={[styles.bioStage, { paddingBottom: insets.bottom + t.spacing.xl }]}>
          <Ionicons name="finger-print" size={64} color={t.color.accent} />
          <Text style={[t.typography.caption, styles.bioHint, { color: t.color.textSecondary }]}>
            Sürətli giriş üçün {bioLabel}. İstədiyiniz vaxt Parametrlərdən söndürə bilərsiniz.
          </Text>
          <Pressable
            onPress={() => finishBiometricStage(true)}
            disabled={busy}
            style={({ pressed }) => [
              styles.bioBtn,
              { backgroundColor: pressed ? t.color.accentPressed : t.color.accent, borderRadius: t.radius.md },
            ]}
          >
            <Text style={[t.typography.title, { fontSize: 15, color: t.color.textOnAccent }]}>
              {bioLabel} ilə aç
            </Text>
          </Pressable>
          <Pressable onPress={() => finishBiometricStage(false)} disabled={busy} hitSlop={10}>
            <Text style={[t.typography.body, { color: t.color.textSecondary, marginTop: t.spacing.md }]}>
              İndi yox
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.pad, { paddingBottom: insets.bottom + t.spacing.md, opacity: isLocked ? 0.4 : 1 }]}>
          {KEYS.map((key) => {
            if (key === "bio" && !(mode === "unlock" && bioReady)) {
              return <View key="bio" style={styles.keySlot} />;
            }
            if (key === "del") {
              return (
                <Pressable
                  key="del"
                  onPress={() => press("del")}
                  style={styles.keySlot}
                  hitSlop={6}
                  disabled={digits.length === 0}
                >
                  <Ionicons
                    name="backspace-outline"
                    size={26}
                    color={t.color.textPrimary}
                    style={{ opacity: digits.length === 0 ? 0.4 : 1 }}
                  />
                </Pressable>
              );
            }
            if (key === "bio") {
              return (
                <Pressable key="bio" onPress={() => press("bio")} style={styles.keySlot} hitSlop={6}>
                  <Ionicons name="finger-print" size={26} color={t.color.accent} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [
                  styles.keySlot,
                  styles.key,
                  {
                    backgroundColor: pressed ? t.color.accentMuted : t.color.surfaceAlt,
                    borderColor: pressed ? t.color.accentLine : "transparent",
                    borderRadius: t.radius.lg,
                  },
                ]}
              >
                <Text style={[t.typography.display, { fontSize: 24, color: t.color.textPrimary }]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {mode === "unlock" && stage !== "biometric" && (
        <Pressable onPress={logout} hitSlop={10} style={[styles.forgot, { paddingBottom: insets.bottom + 4 }]}>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
            PIN-i unutdum · Yenidən daxil ol
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const KEY_SIZE = 64;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  top: { alignItems: "center" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 6, minHeight: 18 },
  dots: { flexDirection: "row", gap: 14, marginTop: 28 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  pad: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignContent: "flex-end",
    rowGap: 16,
    maxWidth: 300,
    alignSelf: "center",
    width: "100%",
  },
  keySlot: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  key: { borderWidth: 1.5 },
  forgot: { alignItems: "center", paddingTop: 8 },
  bioStage: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  bioHint: { textAlign: "center", marginTop: 12, marginBottom: 20, paddingHorizontal: 12 },
  bioBtn: { height: 48, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
});
