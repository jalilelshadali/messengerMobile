import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";

// NOTE (Android keyboard): earlier versions animated the monogram's
// width/height and toggled layout on keyboardDidShow. Any layout change while
// the IME is animating in makes Android think the field blurred and it
// instantly dismisses the keyboard. This screen now has ZERO keyboard
// listeners and ZERO layout animation — a plain ScrollView that the OS
// resizes. Do not reintroduce Keyboard.addListener / Animated layout here.
export default function LoginScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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

  const Wrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

  return (
    <Wrapper style={[styles.root, { backgroundColor: t.color.bg }]} behavior="padding">
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.mono,
              { backgroundColor: t.color.accentMuted, borderColor: t.color.accentLine },
            ]}
          >
            <Ionicons name="shield-checkmark" size={30} color={t.color.accent} />
          </View>
          <Text style={[t.typography.display, styles.title, { color: t.color.textPrimary }]}>
            Xoş gördük, qardaş
          </Text>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
            Böyük Loja · Daxili Ekosistem
          </Text>
        </View>

        <View>
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
            <Text
              style={[
                t.typography.caption,
                styles.link,
                { color: t.color.textPrimary, borderBottomColor: t.color.accentLine },
              ]}
            >
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
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28 },
  header: { alignItems: "center", marginBottom: 32 },
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
  forgot: { alignSelf: "flex-start", marginTop: 14 },
  link: { borderBottomWidth: 2, paddingBottom: 1 },
  footer: { alignItems: "center", gap: 6, marginTop: 40 },
  e2eeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerHint: { textAlign: "center" },
});
