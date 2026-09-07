import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";

// Expo SDK 57 Android is edge-to-edge, so windowSoftInputMode=adjustResize is
// effectively ignored — the window does NOT shrink for the keyboard. The only
// thing that lifts content is KeyboardAvoidingView (it listens to keyboard
// events directly). behavior="padding" adds keyboard-height padding at the
// bottom, shrinking the ScrollView so its centered content rides up and can
// scroll if it doesn't fit. NO focus-driven re-renders anywhere here (that
// was the earlier keyboard-dismiss bug — see Input.js).
export default function LoginScreen() {
  const t = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <SafeAreaView style={[styles.root, { backgroundColor: t.color.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <View style={[styles.mono, { backgroundColor: t.color.accentMuted, borderColor: t.color.accentLine }]}>
              <Ionicons name="shield-checkmark" size={30} color={t.color.accent} />
            </View>
            <Text style={[t.typography.display, styles.title, { color: t.color.textPrimary }]}>
              Xoş gördük, qardaş
            </Text>
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
              Böyük Loja · Daxili Ekosistem
            </Text>
          </View>

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

          <Button
            title="Daxil ol"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!username.trim() || !password}
            style={{ marginTop: 20 }}
          />

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 28 },
  mono: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 20,
  },
  title: { textAlign: "center", marginBottom: 4 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  footer: { alignItems: "center", gap: 6, marginTop: 36 },
  e2eeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerHint: { textAlign: "center" },
});
