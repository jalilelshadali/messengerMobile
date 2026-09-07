import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AdminHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.card} onPress={() => navigation.navigate("AdminUsers")}>
        <View style={styles.iconWrap}>
          <Ionicons name="people" size={26} color="#0d1117" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Üzvləri idarə et</Text>
          <Text style={styles.cardSubtitle}>Yeni üzv yarat, dərəcələri dəyiş</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8b949e" />
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate("AdminOrg")}>
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={26} color="#0d1117" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Grand Loja</Text>
          <Text style={styles.cardSubtitle}>Möhtərəm Lojalar yarat, üzv təyin et</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8b949e" />
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate("AdminBooks")}>
        <View style={styles.iconWrap}>
          <Ionicons name="library" size={26} color="#0d1117" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Kitabxana idarəetməsi</Text>
          <Text style={styles.cardSubtitle}>PDF sənəd əlavə et, dərəcə təyin et</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8b949e" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117", padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#d4af37",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#d4af37", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#8b949e", marginTop: 4, fontSize: 12 },
});
