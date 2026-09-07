import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { assignUserSection, createUser, fetchAllUsers, updateUserDegree } from "../api/admin";
import { fetchUnits } from "../api/org";
import PasswordInput from "../components/PasswordInput";

function flattenSections(units) {
  const flat = [];
  units.forEach((unit) => {
    unit.sections.forEach((section) => {
      flat.push({ id: section.id, label: `${unit.name} / ${section.name}` });
    });
  });
  return flat;
}

function UserRow({ item, sections, onSaved }) {
  const [degreeText, setDegreeText] = useState(String(item.degree));
  const [isSaving, setIsSaving] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  async function handleSaveDegree() {
    const degree = parseInt(degreeText, 10);
    if (!degree || degree < 1 || degree > 33) return;
    setIsSaving(true);
    try {
      const { data } = await updateUserDegree(item.id, degree);
      onSaved(data);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignSection(sectionId) {
    setIsAssigning(true);
    try {
      const { data } = await assignUserSection(item.id, sectionId);
      onSaved(data);
      setIsPickerOpen(false);
    } finally {
      setIsAssigning(false);
    }
  }

  const currentLabel = item.unit_name ? `${item.unit_name} / ${item.section_name}` : "Möhtərəm Loja təyin edilməyib";

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>
            {item.first_name} {item.last_name} {item.is_staff ? "· Admin" : ""}
          </Text>
          <Text style={styles.rowSubtitle}>@{item.username}</Text>
        </View>
        <TextInput
          style={styles.degreeInput}
          keyboardType="number-pad"
          value={degreeText}
          onChangeText={setDegreeText}
          maxLength={2}
        />
        <Pressable style={styles.saveButton} onPress={handleSaveDegree} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#0d1117" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Yadda saxla</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.sectionToggle} onPress={() => setIsPickerOpen((prev) => !prev)}>
        <Text style={styles.sectionToggleText}>{currentLabel}</Text>
      </Pressable>

      {isPickerOpen && (
        <View style={styles.picker}>
          {isAssigning && <ActivityIndicator color="#d4af37" size="small" />}
          {!isAssigning &&
            sections.map((section) => (
              <Pressable key={section.id} style={styles.pickerRow} onPress={() => handleAssignSection(section.id)}>
                <Text style={styles.pickerRowText}>{section.label}</Text>
              </Pressable>
            ))}
          {!isAssigning && sections.length === 0 && (
            <Text style={styles.pickerEmpty}>Hələ Loja yaradılmayıb</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [degree, setDegree] = useState("1");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(() => {
    fetchAllUsers().then(({ data }) => setUsers(data));
    fetchUnits().then(({ data }) => setSections(flattenSections(data)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function handleUserSaved(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function handleCreate() {
    setError("");
    setIsCreating(true);
    try {
      await createUser({
        username: username.trim(),
        password,
        firstName,
        lastName,
        degree: parseInt(degree, 10) || 1,
      });
      setUsername("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setDegree("1");
      setIsFormOpen(false);
      load();
    } catch {
      setError("Üzv yaradıla bilmədi. İstifadəçi adı artıq mövcud ola bilər.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setIsFormOpen((prev) => !prev)}>
        <Text style={styles.toggleText}>{isFormOpen ? "Bağla" : "+ Yeni üzv"}</Text>
      </Pressable>

      {isFormOpen && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ad"
            placeholderTextColor="#8b949e"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Soyad"
            placeholderTextColor="#8b949e"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="İstifadəçi adı"
            placeholderTextColor="#8b949e"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <PasswordInput placeholder="Şifrə (min 8 simvol)" value={password} onChangeText={setPassword} />
          <TextInput
            style={styles.input}
            placeholder="Dərəcə (1-33)"
            placeholderTextColor="#8b949e"
            keyboardType="number-pad"
            value={degree}
            onChangeText={setDegree}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.createButton} onPress={handleCreate} disabled={isCreating}>
            {isCreating ? <ActivityIndicator color="#0d1117" /> : <Text style={styles.createButtonText}>Üzv yarat</Text>}
          </Pressable>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <UserRow item={item} sections={sections} onSaved={handleUserSaved} />}
        contentContainerStyle={{ padding: 12 }}
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
  error: { color: "#f85149", marginBottom: 8 },
  createButton: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center" },
  createButtonText: { color: "#0d1117", fontWeight: "700" },
  row: {
    backgroundColor: "#161b22",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center" },
  rowTitle: { color: "#fff", fontWeight: "600" },
  rowSubtitle: { color: "#8b949e", fontSize: 12, marginTop: 2 },
  degreeInput: {
    width: 44,
    backgroundColor: "#0d1117",
    color: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#30363d",
    textAlign: "center",
    padding: 8,
    marginRight: 8,
  },
  saveButton: { backgroundColor: "#d4af37", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  saveButtonText: { color: "#0d1117", fontWeight: "700", fontSize: 12 },
  sectionToggle: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#0d1117",
  },
  sectionToggleText: { color: "#d4af37", fontSize: 12 },
  picker: { marginTop: 8, backgroundColor: "#0d1117", borderRadius: 6, padding: 6 },
  pickerRow: { paddingVertical: 8, paddingHorizontal: 8 },
  pickerRowText: { color: "#fff", fontSize: 13 },
  pickerEmpty: { color: "#8b949e", fontSize: 12, padding: 8 },
});
