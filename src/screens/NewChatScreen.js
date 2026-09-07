import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import SearchBar from "../components/SearchBar";
import { searchUsers } from "../api/auth";
import { createGroupConversation, startDirectConversation } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";

function nameOf(u) {
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
}

export default function NewChatScreen({ navigation }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // user objects
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);

  const canGroup = me.is_staff;

  useEffect(() => {
    const id = setTimeout(() => {
      searchUsers(search).then(({ data }) => setUsers(data)).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  async function openDirect(u) {
    setBusy(true);
    try {
      const { data } = await startDirectConversation(u.id);
      navigation.replace("Chat", { conversationId: data.id, title: nameOf(u), isGroup: false });
    } finally {
      setBusy(false);
    }
  }

  function toggle(u) {
    setSelected((prev) =>
      prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  }

  async function createGroup() {
    if (selected.length < 2) return;
    setBusy(true);
    try {
      const { data } = await createGroupConversation(
        groupName.trim() || "Qrup",
        selected.map((u) => u.id)
      );
      navigation.replace("Chat", { conversationId: data.id, title: data.name, isGroup: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.top}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Ad və ya @istifadəçi adı" autoFocus />
      </View>

      {canGroup && selected.length > 0 ? (
        <View style={styles.selectedBar}>
          <FlatList
            horizontal
            data={selected}
            keyExtractor={(u) => String(u.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => toggle(item)} style={[styles.selChip, { backgroundColor: t.color.accentMuted }]}>
                <Text style={[t.typography.caption, { color: t.color.textPrimary }]}>{nameOf(item)}</Text>
                <Ionicons name="close" size={13} color={t.color.textSecondary} />
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSel = selected.some((x) => x.id === item.id);
          return (
            <Pressable
              onPress={() => (canGroup ? toggle(item) : openDirect(item))}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? t.color.surfaceAlt : t.color.surface },
              ]}
            >
              <Avatar name={nameOf(item)} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[t.typography.bodySm, { fontSize: 16, color: t.color.textPrimary }]}>{nameOf(item)}</Text>
                <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>@{item.username}</Text>
              </View>
              {canGroup ? (
                <Ionicons
                  name={isSel ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={isSel ? t.color.accent : t.color.border}
                />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={t.color.textSecondary} />
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: t.color.border }]} />}
        ListEmptyComponent={
          <EmptyState icon="person-outline" title="Üzv tapılmadı" hint="Başqa ad yazın" />
        }
      />

      {canGroup && selected.length >= 2 ? (
        <View style={[styles.footer, { backgroundColor: t.color.surface, borderTopColor: t.color.border, paddingBottom: insets.bottom || 12 }]}>
          <Input label={`${selected.length} nəfər seçildi · qrup adı`} value={groupName} onChangeText={setGroupName} placeholder="Qrup adı" />
          <Button title="Qrup yarat" onPress={createGroup} loading={busy} style={{ marginTop: 10 }} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  selectedBar: { paddingVertical: 8 },
  selChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
