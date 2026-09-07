import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Card from "../components/Card";
import Row from "../components/Row";
import SectionHeader from "../components/SectionHeader";
import { useAuth } from "../context/AuthContext";
import { biometricAvailable, getBiometricLabel, getMeta } from "../lib/secureLock";
import { useTheme } from "../theme";

export default function SecurityScreen({ navigation }) {
  const t = useTheme();
  const { setBiometricEnabled } = useAuth();

  const [bioLabel, setBioLabel] = useState("Biometrika");
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    getBiometricLabel().then(setBioLabel);
    biometricAvailable().then(setAvailable);
    getMeta().then((m) => setEnabled(m.biometricEnabled));
  }, []);

  async function toggleBio(next) {
    setNote("");
    const ok = await setBiometricEnabled(next);
    if (ok) {
      setEnabled(next);
    } else {
      setNote(next ? `${bioLabel} aktiv edilə bilmədi.` : "");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={styles.content}>
      <SectionHeader title="Giriş" />
      <Card padded={false} style={styles.card}>
        <Row
          first
          type="toggle"
          icon="finger-print"
          title={`${bioLabel} ilə aç`}
          hint={available ? "Sürətli giriş üçün" : "Bu cihazda əlçatan deyil"}
          toggleValue={enabled}
          onToggle={available ? toggleBio : undefined}
        />
        <Row icon="keypad-outline" title="PIN-i dəyiş" onPress={() => navigation.navigate("ChangePin")} />
      </Card>
      {note ? <Text style={[t.typography.caption, styles.note, { color: t.color.danger }]}>{note}</Text> : null}

      <SectionHeader title="Şifrələmə" />
      <Card style={styles.card}>
        <View style={styles.e2ee}>
          <Ionicons name="lock-closed" size={16} color={t.color.accent} />
          <Text style={[t.typography.body, { color: t.color.textPrimary, flex: 1, fontSize: 14 }]}>
            Birbaşa mesajlar bu cihazda yaradılan açarla uçdan-uca şifrələnir. Gizli açar cihazı tərk etmir.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Bu cihaz" />
      <Card padded={false} style={styles.card}>
        <Row first type="plain" icon="phone-portrait-outline" title="Ekran şəkli qorunması" value="Aktiv" />
      </Card>
      <Text style={[t.typography.caption, styles.note, { color: t.color.textSecondary }]}>
        PIN və biometrika serverə göndərilmir — yalnız bu cihazda saxlanılır. 5 dəfə səhv PIN sessiyanı silir.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  card: { marginHorizontal: 16, overflow: "hidden" },
  e2ee: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  note: { marginHorizontal: 20, marginTop: 8 },
});
