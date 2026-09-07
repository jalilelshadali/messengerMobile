import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchDocuments } from "../api/library";

export default function LibraryScreen() {
  const [documents, setDocuments] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      fetchDocuments().then(({ data }) => {
        if (isActive) setDocuments(data);
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => Linking.openURL(item.file)}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>Minimum dərəcə: {item.min_degree}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Dərəcənizə uyğun sənəd yoxdur</Text>}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  row: { padding: 14, backgroundColor: "#161b22", borderRadius: 8, marginBottom: 10 },
  rowTitle: { color: "#fff", fontWeight: "600", fontSize: 15 },
  rowMeta: { color: "#8b949e", marginTop: 4, fontSize: 12 },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 40 },
});
