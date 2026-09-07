import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchAllDocuments, uploadDocument } from "../api/admin";

export default function AdminBooksScreen() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("");
  const [minDegree, setMinDegree] = useState("1");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(() => {
    fetchAllDocuments().then(({ data }) => setDocuments(data));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled && result.assets?.length) {
      setFile(result.assets[0]);
    }
  }

  async function handleUpload() {
    setError("");
    if (!title.trim() || !file) {
      setError("Başlıq və PDF seçin.");
      return;
    }
    setIsUploading(true);
    try {
      await uploadDocument({ title: title.trim(), minDegree: parseInt(minDegree, 10) || 1, file });
      setTitle("");
      setMinDegree("1");
      setFile(null);
      load();
    } catch {
      setError("Yükləmə alınmadı.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Kitab başlığı"
          placeholderTextColor="#8b949e"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Minimum dərəcə (1-33)"
          placeholderTextColor="#8b949e"
          keyboardType="number-pad"
          value={minDegree}
          onChangeText={setMinDegree}
        />
        <Pressable style={styles.pickButton} onPress={handlePickFile}>
          <Text style={styles.pickButtonText}>{file ? file.name : "PDF seç"}</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.uploadButton} onPress={handleUpload} disabled={isUploading}>
          {isUploading ? <ActivityIndicator color="#0d1117" /> : <Text style={styles.uploadButtonText}>Yüklə</Text>}
        </Pressable>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>Minimum dərəcə: {item.min_degree}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  form: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#30363d" },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  pickButton: {
    backgroundColor: "#161b22",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    borderStyle: "dashed",
  },
  pickButtonText: { color: "#d4af37", textAlign: "center" },
  error: { color: "#f85149", marginBottom: 8 },
  uploadButton: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center" },
  uploadButtonText: { color: "#0d1117", fontWeight: "700" },
  row: { backgroundColor: "#161b22", borderRadius: 8, padding: 12, marginBottom: 10 },
  rowTitle: { color: "#fff", fontWeight: "600" },
  rowSubtitle: { color: "#8b949e", fontSize: 12, marginTop: 4 },
});
