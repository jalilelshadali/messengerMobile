import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
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
const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "del"],
];

export default function PinScreen({ mode = "unlock", onDone }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user, unlock, completePinSetup, changePin, logout } = useAuth();

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
  const showBioKey = mode === "unlock" && bioReady;

  useEffect(() => {
    biometricAvailable().then(setBioReady);
    getBiometricLabel().then(setBioLabel);
    if (mode === "unlock") {
      getLockState().then((s) => s.lockedUntil && setLockedUntil(s.lockedUntil));
    }
  }, [mode]);

  useEffect(() => {
    if (!isLocked) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isLocked]);

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
      Animated.timing(shake, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
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
    if (mode === "unlock") return "Davam etmək üçün PIN kodu daxil edin";
    return "PIN daxil edin";
  }, [error, stage, isLocked, remainingLock, mode]);

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
        setError(res.attemptsLeft > 0 ? `PIN səhvdir · ${res.attemptsLeft} cəhd qaldı` : "PIN səhvdir");
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
      if (showBioKey) handleBiometric();
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

  function finishBiometricStage(wantBio) {
    setBusy(true);
    completePinSetup(firstPin, wantBio);
  }

  const initials = (user?.first_name?.[0] || user?.username?.[0] || "?").toUpperCase();

  // ---- biometric opt-in stage (setup only) ----
  if (stage === "biometric") {
    return (
      <View style={[styles.root, { backgroundColor: t.color.bg, paddingTop: insets.top + 40 }]}>
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: t.color.surfaceAlt }]}>
            <Text style={[t.typography.title, { color: t.color.textPrimary }]}>{initials}</Text>
          </View>
          <Text style={[styles.title, { color: t.color.textPrimary }]}>{title}</Text>
        </View>
        <View style={styles.bioStage}>
          <Ionicons name="finger-print" size={72} color={t.color.accent} />
          <Text style={[t.typography.caption, styles.bioHint, { color: t.color.textSecondary }]}>
            Sürətli giriş üçün {bioLabel}. İstədiyiniz vaxt Parametrlər → Təhlükəsizlik-dən söndürə bilərsiniz.
          </Text>
        </View>
        <View style={{ paddingBottom: insets.bottom + 24, gap: 10 }}>
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
          <Pressable onPress={() => finishBiometricStage(false)} disabled={busy} style={styles.bioSkip}>
            <Text style={[t.typography.body, { color: t.color.textSecondary }]}>İndi yox</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- PIN entry ----
  return (
    <View style={[styles.root, { backgroundColor: t.color.bg, paddingTop: insets.top + 24 }]}>
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: t.color.surfaceAlt }]}>
          <Text style={[t.typography.title, { color: t.color.textPrimary }]}>{initials}</Text>
        </View>
        <Text style={[styles.title, { color: t.color.textPrimary }]}>{title}</Text>
        <Text
          style={[
            t.typography.caption,
            styles.subtitle,
            { color: error ? t.color.danger : t.color.textSecondary },
          ]}
        >
          {subtitle}
        </Text>

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
                    backgroundColor: error ? t.color.danger : filled ? t.color.accent : t.color.surfaceAlt,
                    borderColor: error ? t.color.danger : filled ? t.color.accent : t.color.border,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {mode === "unlock" ? (
          <Pressable onPress={logout} hitSlop={10} style={styles.forgot}>
            <Text
              style={[
                t.typography.caption,
                styles.forgotText,
                { color: t.color.textPrimary, borderBottomColor: t.color.accentLine },
              ]}
            >
              PIN-i unutdum
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.pad, { paddingBottom: insets.bottom + 12, opacity: isLocked ? 0.4 : 1 }]}>
        {ROWS.map((row, r) => (
          <View key={r} style={styles.padRow}>
            {row.map((key) => {
              if (key === "bio") {
                if (!showBioKey) return <View key="bio" style={styles.keyBox} />;
                return (
                  <Pressable
                    key="bio"
                    onPress={() => press("bio")}
                    style={({ pressed }) => [
                      styles.keyBox,
                      styles.keyFace,
                      {
                        backgroundColor: pressed ? t.color.accentMuted : t.color.surface,
                        borderColor: pressed ? t.color.accentLine : t.color.border,
                        borderRadius: t.radius.lg,
                      },
                    ]}
                  >
                    <Ionicons name="finger-print" size={22} color={t.color.accent} />
                    <Text style={[styles.faceLabel, { color: t.color.textSecondary }]}>
                      {bioLabel.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              }
              if (key === "del") {
                return (
                  <Pressable
                    key="del"
                    onPress={() => press("del")}
                    disabled={digits.length === 0}
                    style={styles.keyBox}
                    hitSlop={4}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={26}
                      color={t.color.textPrimary}
                      style={{ opacity: digits.length === 0 ? 0.35 : 1 }}
                    />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={key}
                  onPress={() => press(key)}
                  style={({ pressed }) => [
                    styles.keyBox,
                    styles.keyNum,
                    {
                      backgroundColor: pressed ? t.color.accentMuted : t.color.surfaceAlt,
                      borderColor: pressed ? t.color.accentLine : "transparent",
                      borderRadius: t.radius.lg,
                    },
                  ]}
                >
                  <Text style={[styles.keyDigit, { color: t.color.textPrimary }]}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  top: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { alignItems: "center" },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "Archivo-Bold", fontSize: 21, textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 6, minHeight: 18 },
  dots: { flexDirection: "row", gap: 14, marginTop: 26 },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },
  forgot: { marginTop: 22 },
  forgotText: { borderBottomWidth: 1.5, paddingBottom: 1 },

  pad: { width: "100%", maxWidth: 340, alignSelf: "center", gap: 14 },
  padRow: { flexDirection: "row", justifyContent: "space-between" },
  keyBox: {
    width: "30%",
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  keyNum: { borderWidth: 1.5 },
  keyFace: { borderWidth: 1.5, gap: 2 },
  keyDigit: { fontFamily: "Archivo-SemiBold", fontSize: 24 },
  faceLabel: { fontFamily: "Archivo-SemiBold", fontSize: 9, letterSpacing: 0.5 },

  bioStage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  bioHint: { textAlign: "center", marginTop: 16, paddingHorizontal: 12 },
  bioBtn: { height: 48, alignItems: "center", justifyContent: "center" },
  bioSkip: { height: 44, alignItems: "center", justifyContent: "center" },
});
