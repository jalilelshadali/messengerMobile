import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { searchUsers } from "../api/auth";
import { createMeeting } from "../api/meetings";
import { fetchUnits } from "../api/org";

export default function CreateMeetingScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [units, setUnits] = useState([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUnits().then(({ data }) => setUnits(data));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setCandidates([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchUsers(search).then(({ data }) => setCandidates(data));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  function toggleUnit(id) {
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSection(id) {
    setSelectedSectionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addUser(user) {
    if (selectedUsers.some((u) => u.id === user.id)) return;
    setSelectedUsers((prev) => [...prev, user]);
    setSearch("");
    setCandidates([]);
  }

  function removeUser(id) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleCreate() {
    setError("");
    if (!title.trim() || !date.trim() || !time.trim()) {
      setError("Başlıq, tarix və saat mütləqdir (məs: 2026-09-01, 18:00).");
      return;
    }
    const startsAt = new Date(`${date.trim()}T${time.trim()}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Tarix/saat formatı yanlışdır. Nümunə: 2026-09-01 və 18:00");
      return;
    }
    setIsCreating(true);
    try {
      await createMeeting({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startsAt: startsAt.toISOString(),
        userIds: selectedUsers.map((u) => u.id),
        sectionIds: selectedSectionIds,
        unitIds: selectedUnitIds,
      });
      navigation.goBack();
    } catch {
      setError("İclas yaradıla bilmədi.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TextInput
        style={styles.input}
        placeholder="Başlıq"
        placeholderTextColor="#8b949e"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Yer"
        placeholderTextColor="#8b949e"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={[styles.input, { height: 70 }]}
        placeholder="Təsvir (istəyə bağlı)"
        placeholderTextColor="#8b949e"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.rowInput]}
          placeholder="Tarix (2026-09-01)"
          placeholderTextColor="#8b949e"
          value={date}
          onChangeText={setDate}
        />
        <TextInput
          style={[styles.input, styles.rowInput]}
          placeholder="Saat (18:00)"
          placeholderTextColor="#8b949e"
          value={time}
          onChangeText={setTime}
        />
      </View>

      <Text style={styles.sectionLabel}>GRAND LOJA (bütün üzvlərini dəvət et)</Text>
      {units.map((unit) => (
        <Pressable key={unit.id} style={styles.checkRow} onPress={() => toggleUnit(unit.id)}>
          <Text style={styles.checkText}>
            {selectedUnitIds.includes(unit.id) ? "☑ " : "☐ "}
            {unit.name}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.sectionLabel}>MÖHTƏRƏM LOJALAR</Text>
      {units.flatMap((unit) =>
        unit.sections.map((section) => (
          <Pressable key={section.id} style={styles.checkRow} onPress={() => toggleSection(section.id)}>
            <Text style={styles.checkText}>
              {selectedSectionIds.includes(section.id) ? "☑ " : "☐ "}
              {unit.name} / {section.name}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionLabel}>XÜSUSİ ŞƏXSLƏR</Text>
      <TextInput
        style={styles.input}
        placeholder="Üzv axtar..."
        placeholderTextColor="#8b949e"
        autoCapitalize="none"
        value={search}
        onChangeText={setSearch}
      />
      {candidates.map((u) => (
        <Pressable key={u.id} style={styles.checkRow} onPress={() => addUser(u)}>
          <Text style={styles.checkText}>
            + {u.first_name} {u.last_name} (@{u.username})
          </Text>
        </Pressable>
      ))}
      {selectedUsers.map((u) => (
        <Pressable key={u.id} style={styles.selectedUserRow} onPress={() => removeUser(u.id)}>
          <Text style={styles.selectedUserText}>
            {u.first_name} {u.last_name} ✕
          </Text>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.createButton} onPress={handleCreate} disabled={isCreating}>
        {isCreating ? <ActivityIndicator color="#0d1117" /> : <Text style={styles.createButtonText}>İclası yarat</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  row: { flexDirection: "row", gap: 10 },
  rowInput: { flex: 1 },
  sectionLabel: {
    color: "#8b949e",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  checkRow: { paddingVertical: 6 },
  checkText: { color: "#fff", fontSize: 13 },
  selectedUserRow: {
    backgroundColor: "#161b22",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  selectedUserText: { color: "#d4af37", fontSize: 12 },
  error: { color: "#f85149", marginTop: 12 },
  createButton: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  createButtonText: { color: "#0d1117", fontWeight: "700" },
});
