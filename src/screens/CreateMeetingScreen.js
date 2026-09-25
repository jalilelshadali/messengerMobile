import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Button from "../components/Button";
import Chip from "../components/Chip";
import Input from "../components/Input";
import SearchBar from "../components/SearchBar";
import SectionHeader from "../components/SectionHeader";
import { searchUsers } from "../api/auth";
import { createMeeting } from "../api/meetings";
import { fetchUnits } from "../api/org";
import { useTheme } from "../theme";

function nameOf(u) {
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
}

export default function CreateMeetingScreen({ navigation }) {
  const t = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [units, setUnits] = useState([]);
  const [allUsers, setAllUsers] = useState(false);
  const [unitIds, setUnitIds] = useState([]);
  const [sectionIds, setSectionIds] = useState([]);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchUnits().then(({ data }) => setUnits(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!search.trim()) return setCandidates([]);
    const id = setTimeout(() => {
      searchUsers(search).then(({ data }) => setCandidates(data)).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const toggle = (arr, setArr, id) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  function addUser(u) {
    if (!selectedUsers.some((x) => x.id === u.id)) setSelectedUsers((p) => [...p, u]);
    setSearch("");
    setCandidates([]);
  }

  async function create() {
    setError("");
    if (!title.trim() || !date.trim() || !time.trim()) {
      setError("Başlıq, tarix və saat mütləqdir.");
      return;
    }
    const startsAt = new Date(`${date.trim()}T${time.trim()}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      setError("Format yanlışdır. Nümunə: 2026-09-01 və 18:00");
      return;
    }
    setBusy(true);
    try {
      await createMeeting({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startsAt: startsAt.toISOString(),
        userIds: selectedUsers.map((u) => u.id),
        sectionIds,
        unitIds,
        allUsers,
      });
      navigation.goBack();
    } catch {
      setError("İclas yaradıla bilmədi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={styles.content}>
      <View style={styles.fields}>
        <Input label="Başlıq" value={title} onChangeText={setTitle} placeholder="İclas adı" />
        <Input label="Yer" value={location} onChangeText={setLocation} placeholder="Ünvan / otaq" style={styles.gap} />
        <Input label="Təsvir" value={description} onChangeText={setDescription} placeholder="İstəyə bağlı" style={styles.gap} />
        <View style={[styles.row, styles.gap]}>
          <Input label="Tarix" value={date} onChangeText={setDate} placeholder="2026-09-01" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
          <Input label="Saat" value={time} onChangeText={setTime} placeholder="18:00" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} />
        </View>
      </View>

      <SectionHeader title="Kimə göndərilsin" />
      <View style={styles.chipWrap}>
        <Chip label="Hamı (bütün üzvlər)" selected={allUsers} onPress={() => setAllUsers((v) => !v)} />
      </View>
      {allUsers ? (
        <Text style={[t.typography.caption, { color: t.color.textSecondary, paddingHorizontal: 16, marginTop: 8 }]}>
          Bütün üzvlərə dəvət və bildiriş göndəriləcək.
        </Text>
      ) : null}

      <View style={allUsers ? { opacity: 0.4 } : null} pointerEvents={allUsers ? "none" : "auto"}>
      <SectionHeader title="Böyük Loja" />
      <View style={styles.chipWrap}>
        {units.map((u) => (
          <Chip key={u.id} label={u.name} selected={unitIds.includes(u.id)} onPress={() => toggle(unitIds, setUnitIds, u.id)} />
        ))}
      </View>

      <SectionHeader title="Möhtərəm Lojalar" />
      <View style={styles.chipWrap}>
        {units.flatMap((u) =>
          (u.sections || []).map((s) => (
            <Chip
              key={s.id}
              label={`${u.name} / ${s.name}`}
              selected={sectionIds.includes(s.id)}
              onPress={() => toggle(sectionIds, setSectionIds, s.id)}
            />
          ))
        )}
      </View>

      <SectionHeader title="Xüsusi şəxslər" />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Üzv axtar" style={{ marginHorizontal: 16 }} />
      <View style={{ paddingHorizontal: 16 }}>
        {candidates.map((u) => (
          <Pressable key={u.id} onPress={() => addUser(u)} style={styles.candidate}>
            <Ionicons name="add-circle-outline" size={18} color={t.color.accent} />
            <Text style={[t.typography.bodySm, { color: t.color.textPrimary }]}>
              {nameOf(u)} · @{u.username}
            </Text>
          </Pressable>
        ))}
        <View style={styles.chipWrap}>
          {selectedUsers.map((u) => (
            <Chip key={u.id} label={`${nameOf(u)} ✕`} selected onPress={() => setSelectedUsers((p) => p.filter((x) => x.id !== u.id))} />
          ))}
        </View>
      </View>

      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={t.color.danger} />
          <Text style={[t.typography.caption, { color: t.color.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Button title="İclası yarat" onPress={create} loading={busy} style={{ margin: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 40 },
  fields: { paddingHorizontal: 16 },
  gap: { marginTop: 12 },
  row: { flexDirection: "row", gap: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  candidate: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, marginTop: 12 },
});
