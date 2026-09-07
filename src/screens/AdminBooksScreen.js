import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { fetchAllDocuments, uploadDocument } from "../api/admin";
import { useTheme } from "../theme";

export default function AdminBooksScreen() {
  const t = useTheme();
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [minDegree, setMinDegree] = useState("1");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    fetchAllDocuments().then(({ data }) => setDocuments(data)).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets?.length) setFile(result.assets[0]);
  }

  async function upload() {
    setError("");
    if (!title.trim() || !file) {
      setError("Başlıq və PDF seçin.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({ title: title.trim(), minDegree: parseInt(minDegree, 10) || 1, file });
      setTitle("");
      setMinDegree("1");
      setFile(null);
      load();
    } catch {
      setError("Yükləmə alınmadı.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <Card style={{ gap: 10, marginBottom: 6 }}>
            <Input label="Kitab başlığı" value={title} onChangeText={setTitle} />
            <Input label="Minimum dərəcə (1-33)" value={minDegree} onChangeText={setMinDegree} keyboardType="number-pad" />
            <Pressable
              onPress={pick}
              style={[styles.pick, { borderColor: t.color.border, backgroundColor: t.color.surfaceAlt }]}
            >
              <Ionicons name="document-attach-outline" size={18} color={t.color.accent} />
              <Text style={[t.typography.bodySm, { color: file ? t.color.textPrimary : t.color.accent }]} numberOfLines={1}>
                {file ? file.name : "PDF seç"}
              </Text>
            </Pressable>
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={t.color.danger} />
                <Text style={[t.typography.caption, { color: t.color.danger }]}>{error}</Text>
              </View>
            ) : null}
            <Button title="Yüklə" onPress={upload} loading={uploading} />
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 2 }}>
            <Text style={[t.typography.bodySm, { fontSize: 15, color: t.color.textPrimary }]}>{item.title}</Text>
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
              Minimum dərəcə: {item.min_degree}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 12,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
});
