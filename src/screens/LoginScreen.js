import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Böyük Loja</Text>
      <Text style={styles.subtitle}>Daxili Ekosistem</Text>

      <TextInput
        style={styles.input}
        placeholder="İstifadəçi adı"
        placeholderTextColor="#8b949e"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <PasswordInput placeholder="Şifrə" value={password} onChangeText={setPassword} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#0d1117" /> : <Text style={styles.buttonText}>Daxil ol</Text>}
      </Pressable>

      <Text style={styles.hint}>Hesabınız yoxdursa, Böyük Katiblə əlaqə saxlayın.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0d1117" },
  title: { fontSize: 32, fontWeight: "700", color: "#d4af37", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#8b949e", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  button: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#0d1117", fontWeight: "700" },
  error: { color: "#f85149", marginBottom: 8 },
  hint: { color: "#8b949e", textAlign: "center", marginTop: 20, fontSize: 13 },
});
