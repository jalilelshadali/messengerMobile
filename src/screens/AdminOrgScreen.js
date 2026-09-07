import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import { createSection, createUnit, fetchUnits } from "../api/org";
import { useTheme } from "../theme";

function UnitCard({ unit, onSectionCreated }) {
  const t = useTheme();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createSection(unit.id, name.trim());
      setName("");
      setFormOpen(false);
      onSectionCreated();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.unitHeader}>
        <Text style={[t.typography.title, { fontSize: 16, color: t.color.textPrimary }]}>{unit.name}</Text>
        <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{unit.member_count} üzv</Text>
      </View>

      {(unit.sections || []).map((s) => (
        <View key={s.id} style={[styles.sectionRow, { borderTopColor: t.color.border }]}>
          <Text style={[t.typography.bodySm, { color: t.color.textPrimary }]}>{s.name}</Text>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{s.member_count} üzv</Text>
        </View>
      ))}

      {formOpen ? (
        <View style={styles.inlineForm}>
          <Input value={name} onChangeText={setName} placeholder="Möhtərəm Loja adı" style={{ flex: 1 }} />
          <Button title="Yarat" onPress={create} loading={creating} style={{ paddingHorizontal: 14 }} />
        </View>
      ) : (
        <Pressable onPress={() => setFormOpen(true)} style={{ marginTop: 10 }}>
          <Text style={[t.typography.caption, { color: t.color.accent }]}>+ Yeni Möhtərəm Loja</Text>
        </Pressable>
      )}
    </Card>
  );
}

export default function AdminOrgScreen() {
  const t = useTheme();
  const [units, setUnits] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetchUnits().then(({ data }) => setUnits(data)).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  async function createUnitHandler() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createUnit(name.trim());
      setName("");
      setFormOpen(false);
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <FlatList
        data={units}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <UnitCard unit={item} onSectionCreated={load} />}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <Button
              title={formOpen ? "Bağla" : "Yeni Böyük Loja"}
              variant={formOpen ? "ghost" : "primary"}
              onPress={() => setFormOpen((v) => !v)}
            />
            {formOpen ? (
              <Card style={{ marginTop: 12, gap: 10 }}>
                <Input label="Böyük Loja adı" value={name} onChangeText={setName} />
                <Button title="Yarat" onPress={createUnitHandler} loading={creating} />
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="business-outline" title="Hələ Böyük Loja yoxdur" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  unitHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingLeft: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inlineForm: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "flex-start" },
});
