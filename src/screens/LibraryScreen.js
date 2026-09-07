import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Linking, StyleSheet, Text, View } from "react-native";

import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import SearchBar from "../components/SearchBar";
import { fetchDocuments } from "../api/library";
import { useTheme } from "../theme";

export default function LibraryScreen() {
  const t = useTheme();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchDocuments()
        .then(({ data }) => active && setDocuments(data))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  const rows = documents.filter(
    (d) => !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Sənəd axtar" />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={[styles.fileIcon, { backgroundColor: t.color.accentMuted }]}>
              <Ionicons name="document-text" size={22} color={t.color.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.typography.bodySm, { fontSize: 15, color: t.color.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[t.typography.caption, { color: t.color.textSecondary, marginTop: 2 }]}>
                Minimum dərəcə: {item.min_degree}
              </Text>
              <Button
                title="Aç"
                variant="secondary"
                onPress={() => Linking.openURL(item.file)}
                style={{ marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 20, minHeight: 36 }}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="library-outline"
            title={search ? "Sənəd tapılmadı" : "Sənəd yoxdur"}
            hint={search ? "Başqa açar söz yazın" : "Dərəcənizə uyğun sənəd hələ yoxdur"}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  card: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  fileIcon: { width: 42, height: 52, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});
