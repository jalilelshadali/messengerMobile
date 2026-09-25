import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import Avatar from "./Avatar";
import BottomSheet from "./BottomSheet";
import SearchBar from "./SearchBar";
import { searchUsers } from "../api/auth";
import { fetchConversations } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { forwardText } from "../lib/forward";
import { useTheme } from "../theme";

function fullName(u) {
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
}

function titleOf(c, meId) {
  if (c.is_group) return c.name || "Qrup";
  const other = c.participants.find((p) => p.id !== meId);
  return other ? fullName(other) : "Söhbət";
}

// Mesajı yönləndirmək üçün söhbət/istifadəçi seçimi (çoxlu seçim mümkündür).
export default function ForwardSheet({ visible, text, onClose, onDone }) {
  const t = useTheme();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // key -> target
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch("");
    setSelected({});
    setUsers([]);
    fetchConversations()
      .then(({ data }) => setConversations(data))
      .catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!visible || search.trim().length < 2) {
      setUsers([]);
      return undefined;
    }
    const id = setTimeout(() => {
      searchUsers(search.trim())
        .then(({ data }) => setUsers(data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [search, visible]);

  const q = search.trim().toLowerCase();
  const convRows = conversations
    .map((c) => ({ key: `c${c.id}`, title: titleOf(c, user.id), group: c.is_group, target: { conversation: c }, c }))
    .filter((r) => !q || r.title.toLowerCase().includes(q));

  // Artıq birbaşa söhbəti olan istifadəçiləri təkrar göstərmə.
  const haveDirect = new Set(
    conversations.filter((c) => !c.is_group).flatMap((c) => c.participants.map((p) => p.id))
  );
  const userRows = users
    .filter((u) => u.id !== user.id && !haveDirect.has(u.id))
    .map((u) => ({ key: `u${u.id}`, title: fullName(u), group: false, target: { user: u } }));

  const rows = [...convRows, ...userRows];
  const count = Object.keys(selected).length;

  function toggle(row) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[row.key]) delete next[row.key];
      else next[row.key] = row.target;
      return next;
    });
  }

  async function send() {
    if (!count || sending) return;
    setSending(true);
    const results = await forwardText(text, Object.values(selected), user.id);
    setSending(false);
    onDone?.({
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[t.typography.title, { color: t.color.textPrimary, marginBottom: 10 }]}>Yönləndir</Text>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Söhbət və ya şəxs axtar" />

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        style={{ marginTop: 8, height: 320 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[t.typography.caption, { color: t.color.textSecondary, textAlign: "center", marginTop: 24 }]}>
            Nəticə yoxdur
          </Text>
        }
        renderItem={({ item }) => {
          const on = !!selected[item.key];
          return (
            <Pressable
              onPress={() => toggle(item)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.color.surfaceAlt }]}
            >
              <Avatar name={item.title} size={40} variant={item.group ? "group" : "user"} />
              <Text numberOfLines={1} style={[t.typography.body, { flex: 1, color: t.color.textPrimary }]}>
                {item.title}
              </Text>
              <Ionicons
                name={on ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={on ? t.color.accent : t.color.border}
              />
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={send}
        disabled={!count || sending}
        style={[styles.send, { backgroundColor: t.color.accent, opacity: !count || sending ? 0.5 : 1 }]}
      >
        {sending ? (
          <ActivityIndicator color={t.color.textOnAccent} />
        ) : (
          <Text style={[t.typography.body, { fontFamily: "Archivo-SemiBold", color: t.color.textOnAccent }]}>
            {count ? `Göndər (${count})` : "Göndər"}
          </Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  send: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 12 },
});
