import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { assignUserSection, createUser, fetchAllUsers, updateUserDegree } from "../api/admin";
import { fetchUnits } from "../api/org";
import { useTheme } from "../theme";

function flattenSections(units) {
  const flat = [];
  units.forEach((unit) => {
    (unit.sections || []).forEach((section) => {
      flat.push({ id: section.id, label: `${unit.name} / ${section.name}` });
    });
  });
  return flat;
}

function UserRow({ item, sections, onSaved }) {
  const t = useTheme();
  const [degreeText, setDegreeText] = useState(String(item.degree));
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function saveDegree() {
    const degree = parseInt(degreeText, 10);
    if (!degree || degree < 1 || degree > 33) return;
    setSaving(true);
    try {
      const { data } = await updateUserDegree(item.id, degree);
      onSaved(data);
    } finally {
      setSaving(false);
    }
  }

  async function assign(sectionId) {
    setAssigning(true);
    try {
      const { data } = await assignUserSection(item.id, sectionId);
      onSaved(data);
      setPickerOpen(false);
    } finally {
      setAssigning(false);
    }
  }

  const currentLabel = item.unit_name
    ? `${item.unit_name} / ${item.section_name}`
    : "Möhtərəm Loja təyin edilməyib";

  return (
    <Card style={styles.card}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={[t.typography.bodySm, { fontSize: 15, color: t.color.textPrimary }]}>
            {item.first_name} {item.last_name} {item.is_staff ? "· Admin" : ""}
          </Text>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>@{item.username}</Text>
        </View>
        <TextInput
          style={[
            styles.degreeInput,
            { backgroundColor: t.color.surfaceAlt, color: t.color.textPrimary, borderColor: t.color.border },
          ]}
          keyboardType="number-pad"
          value={degreeText}
          onChangeText={setDegreeText}
          maxLength={2}
        />
        <Button title="Saxla" onPress={saveDegree} loading={saving} style={styles.saveBtn} />
      </View>

      <Pressable onPress={() => setPickerOpen((v) => !v)} style={[styles.sectionToggle, { borderTopColor: t.color.border }]}>
        <Text style={[t.typography.caption, { color: t.color.accent }]}>{currentLabel}</Text>
        <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={14} color={t.color.textSecondary} />
      </Pressable>

      {pickerOpen ? (
        <View style={[styles.picker, { backgroundColor: t.color.surfaceAlt }]}>
          {assigning ? <ActivityIndicator color={t.color.accent} size="small" /> : null}
          {!assigning &&
            sections.map((s) => (
              <Pressable key={s.id} style={styles.pickerRow} onPress={() => assign(s.id)}>
                <Text style={[t.typography.caption, { color: t.color.textPrimary }]}>{s.label}</Text>
              </Pressable>
            ))}
          {!assigning && sections.length === 0 ? (
            <Text style={[t.typography.caption, { color: t.color.textSecondary, padding: 8 }]}>Hələ Loja yaradılmayıb</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function AdminUsersScreen() {
  const t = useTheme();
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [degree, setDegree] = useState("1");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetchAllUsers().then(({ data }) => setUsers(data)).catch(() => {});
    fetchUnits().then(({ data }) => setSections(flattenSections(data))).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  function onSaved(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function create() {
    setError("");
    setCreating(true);
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
      setFormOpen(false);
      load();
    } catch {
      setError("Üzv yaradıla bilmədi. İstifadəçi adı artıq mövcud ola bilər.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <UserRow item={item} sections={sections} onSaved={onSaved} />}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 6 }}>
            <Button
              title={formOpen ? "Bağla" : "Yeni üzv"}
              variant={formOpen ? "ghost" : "primary"}
              icon={!formOpen ? <Ionicons name="person-add" size={16} color={t.color.textOnAccent} /> : null}
              onPress={() => setFormOpen((v) => !v)}
            />
            {formOpen ? (
              <Card style={{ marginTop: 12, gap: 10 }}>
                <Input label="Ad" value={firstName} onChangeText={setFirstName} />
                <Input label="Soyad" value={lastName} onChangeText={setLastName} />
                <Input label="İstifadəçi adı" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <Input label="Şifrə" value={password} onChangeText={setPassword} secureTextEntry />
                <Input label="Dərəcə (1-33)" value={degree} onChangeText={setDegree} keyboardType="number-pad" />
                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={t.color.danger} />
                    <Text style={[t.typography.caption, { color: t.color.danger, flex: 1 }]}>{error}</Text>
                  </View>
                ) : null}
                <Button title="Üzv yarat" onPress={create} loading={creating} />
              </Card>
            ) : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  degreeInput: {
    width: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    textAlign: "center",
    paddingVertical: 8,
    fontFamily: "Archivo-Regular",
  },
  saveBtn: { paddingHorizontal: 14, minHeight: 40 },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  picker: { marginTop: 8, borderRadius: 8, padding: 6 },
  pickerRow: { paddingVertical: 8, paddingHorizontal: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5 },
});
