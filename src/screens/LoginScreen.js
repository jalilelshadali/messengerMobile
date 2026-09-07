import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";

export default function LoginScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mono = useRef(new Animated.Value(88)).current;

  useEffect(() => {
    const evShow = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const evHide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const to = (v) => Animated.timing(mono, { toValue: v, duration: 180, useNativeDriver: false }).start();
    const s = Keyboard.addListener(evShow, () => to(56));
    const h = Keyboard.addListener(evHide, () => to(88));
    return () => {
      s.remove();
      h.remove();
    };
  }, [mono]);

  async function handleSubmit() {
    if (!username.trim() || !password) return;
    Keyboard.dismiss();
    setError("");
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      if (!err.response) {
        setError("Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın.");
      } else if (err.response.status === 401) {
        setError("İstifadəçi adı və ya şifrə yanlışdır.");
      } else {
        setError(`Xəta baş verdi (${err.response.status}). Yenidən cəhd edin.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: t.color.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.mono,
              { width: mono, height: mono, borderRadius: 999, backgroundColor: t.color.accentMuted, borderColor: t.color.accentLine },
            ]}
          >
            <Ionicons name="shield-checkmark" size={32} color={t.color.accent} />
          </Animated.View>
          <Text style={[t.typography.display, styles.title, { color: t.color.textPrimary }]}>
            Xoş gördük, qardaş
          </Text>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>Böyük Loja · Daxili Ekosistem</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="İstifadəçi adı"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            invalid={Boolean(error)}
            returnKeyType="next"
          />
          <Input
            label="Şifrə"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            invalid={Boolean(error)}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            style={{ marginTop: 14 }}
          />
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={t.color.danger} />
              <Text style={[t.typography.caption, { color: t.color.danger, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable hitSlop={8} style={styles.forgot}>
            <Text style={[t.typography.caption, styles.link, { color: t.color.textPrimary, borderBottomColor: t.color.accentLine }]}>
              Şifrəni unutdum
            </Text>
          </Pressable>

          <Button
            title="Daxil ol"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!username.trim() || !password}
            style={{ marginTop: 20 }}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.e2eeRow}>
            <Ionicons name="lock-closed" size={13} color={t.color.textSecondary} />
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
              Mesajlar uçdan-uca şifrələnir
            </Text>
          </View>
          <Text style={[t.typography.caption, styles.footerHint, { color: t.color.textSecondary }]}>
            Hesabınız yoxdursa, Böyük Katiblə əlaqə saxlayın.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  mono: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, marginBottom: 20 },
  title: { textAlign: "center", marginBottom: 4 },
  form: {},
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  forgot: { alignSelf: "flex-start", marginTop: 14 },
  link: { borderBottomWidth: 2, paddingBottom: 1 },
  footer: { position: "absolute", left: 28, right: 28, bottom: 0, alignItems: "center", gap: 6 },
  e2eeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerHint: { textAlign: "center" },
});
