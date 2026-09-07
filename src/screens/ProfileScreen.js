import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { formatDegree } from "../degrees";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={40} color="#0d1117" />
      </View>

      <Text style={styles.name}>
        {user.first_name} {user.last_name}
      </Text>
      <Text style={styles.username}>@{user.username}</Text>
      {user.is_staff && (
        <View style={styles.adminTag}>
          <Ionicons name="shield-checkmark" size={13} color="#d4af37" />
          <Text style={styles.adminTagText}>Admin</Text>
        </View>
      )}

      <View style={styles.levelCard}>
        <Text style={styles.levelValue}>{formatDegree(user.degree)}</Text>
      </View>

      {user.unit_name && (
        <View style={styles.orgCard}>
          <View style={styles.orgRow}>
            <Ionicons name="business-outline" size={16} color="#8b949e" />
            <Text style={styles.orgLabel}>Grand Loja</Text>
            <Text style={styles.orgValue}>{user.unit_name}</Text>
          </View>
          <View style={styles.orgRow}>
            <Ionicons name="people-outline" size={16} color="#8b949e" />
            <Text style={styles.orgLabel}>Möhtərəm Loja</Text>
            <Text style={styles.orgValue}>{user.section_name}</Text>
          </View>
        </View>
      )}

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color="#8b949e" />
        <Text style={styles.meta}>Qoşulma tarixi: {new Date(user.joined_at).toLocaleDateString("az-AZ")}</Text>
      </View>

      <Pressable style={styles.button} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#f85149" />
        <Text style={styles.buttonText}>Çıxış</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117", alignItems: "center", paddingTop: 60, padding: 24 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#d4af37",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },
  username: { color: "#8b949e", marginTop: 4 },
  adminTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  adminTagText: { color: "#d4af37", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  levelCard: {
    width: "100%",
    backgroundColor: "#161b22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 18,
    marginTop: 24,
    alignItems: "center",
  },
  levelValue: { color: "#d4af37", fontSize: 18, fontWeight: "700" },
  orgCard: {
    width: "100%",
    backgroundColor: "#161b22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 16,
    marginTop: 14,
    gap: 10,
  },
  orgRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orgLabel: { color: "#8b949e", fontSize: 13, flex: 1 },
  orgValue: { color: "#fff", fontSize: 13, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24 },
  meta: { color: "#8b949e" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 8,
    padding: 14,
    marginTop: 40,
    width: "100%",
  },
  buttonText: { color: "#f85149", fontWeight: "600" },
});
