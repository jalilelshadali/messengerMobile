import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { createSection, createUnit, fetchUnits } from "../api/org";

function UnitCard({ unit, onSectionCreated }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await createSection(unit.id, name.trim());
      setName("");
      setIsFormOpen(false);
      onSectionCreated();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.unitCard}>
      <View style={styles.unitHeader}>
        <Text style={styles.unitTitle}>{unit.name}</Text>
        <Text style={styles.unitMeta}>{unit.member_count} üzv</Text>
      </View>

      {unit.sections.map((section) => (
        <View key={section.id} style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{section.name}</Text>
          <Text style={styles.sectionMeta}>{section.member_count} üzv</Text>
        </View>
      ))}

      {isFormOpen ? (
        <View style={styles.inlineForm}>
          <TextInput
            style={styles.input}
            placeholder="Möhtərəm Loja adı"
            placeholderTextColor="#8b949e"
            value={name}
            onChangeText={setName}
          />
          <Pressable style={styles.smallButton} onPress={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <ActivityIndicator color="#0d1117" size="small" />
            ) : (
              <Text style={styles.smallButtonText}>Yarat</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setIsFormOpen(true)}>
          <Text style={styles.addSectionLink}>+ Yeni Möhtərəm Loja</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function AdminOrgScreen() {
  const [units, setUnits] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(() => {
    fetchUnits().then(({ data }) => setUnits(data));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreateUnit() {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await createUnit(name.trim());
      setName("");
      setIsFormOpen(false);
      load();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setIsFormOpen((prev) => !prev)}>
        <Text style={styles.toggleText}>{isFormOpen ? "Bağla" : "+ Yeni Grand Loja"}</Text>
      </Pressable>

      {isFormOpen && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Grand Loja adı"
            placeholderTextColor="#8b949e"
            value={name}
            onChangeText={setName}
          />
          <Pressable style={styles.createButton} onPress={handleCreateUnit} disabled={isCreating}>
            {isCreating ? (
              <ActivityIndicator color="#0d1117" />
            ) : (
              <Text style={styles.createButtonText}>Yarat</Text>
            )}
          </Pressable>
        </View>
      )}

      <FlatList
        data={units}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <UnitCard unit={item} onSectionCreated={load} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>Hələ Grand Loja yoxdur</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  toggle: { padding: 14, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#30363d" },
  toggleText: { color: "#d4af37", fontWeight: "700" },
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
  createButton: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center" },
  createButtonText: { color: "#0d1117", fontWeight: "700" },
  unitCard: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 14,
    marginBottom: 12,
  },
  unitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  unitTitle: { color: "#d4af37", fontSize: 16, fontWeight: "700" },
  unitMeta: { color: "#8b949e", fontSize: 12 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingLeft: 12,
    borderTopWidth: 1,
    borderTopColor: "#0d1117",
  },
  sectionTitle: { color: "#fff" },
  sectionMeta: { color: "#8b949e", fontSize: 12 },
  addSectionLink: { color: "#d4af37", marginTop: 10, fontSize: 13 },
  inlineForm: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallButton: { backgroundColor: "#d4af37", borderRadius: 6, paddingHorizontal: 14, justifyContent: "center" },
  smallButtonText: { color: "#0d1117", fontWeight: "700", fontSize: 12 },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 40 },
});
