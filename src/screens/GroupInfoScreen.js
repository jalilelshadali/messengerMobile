import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import ConfirmDialog from "../components/ConfirmDialog";
import Input from "../components/Input";
import SearchBar from "../components/SearchBar";
import SectionHeader from "../components/SectionHeader";
import { searchUsers } from "../api/auth";
import {
  addMembers,
  fetchConversation,
  leaveConversation,
  removeMember,
  renameConversation,
  setConversationAdmin,
} from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";

function nameOf(u) {
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
}

export default function GroupInfoScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();

  const [conversation, setConversation] = useState(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const load = useCallback(() => {
    fetchConversation(conversationId).then(({ data }) => {
      setConversation(data);
      setName(data.name);
    });
  }, [conversationId]);

  useFocusEffect(useCallback(() => load(), [load]));

  async function saveName() {
    if (!name.trim() || name === conversation.name) return;
    setSavingName(true);
    try {
      const { data } = await renameConversation(conversationId, name.trim());
      setConversation(data);
    } finally {
      setSavingName(false);
    }
  }

  async function onSearch(text) {
    setSearch(text);
    if (!text.trim()) return setCandidates([]);
    const { data } = await searchUsers(text);
    const ids = new Set(conversation.participants.map((p) => p.id));
    setCandidates(data.filter((u) => !ids.has(u.id)));
  }

  async function add(userId) {
    await addMembers(conversationId, [userId]);
    setSearch("");
    setCandidates([]);
    setAddOpen(false);
    load();
  }

  async function remove(userId) {
    await removeMember(conversationId, userId);
    load();
  }

  async function toggleAdmin(userId, makeAdmin) {
    await setConversationAdmin(conversationId, userId, makeAdmin);
    load();
  }

  async function leave() {
    await leaveConversation(conversationId);
    navigation.navigate("ChatList");
  }

  if (!conversation) {
    return (
      <View style={[styles.center, { backgroundColor: t.color.bg }]}>
        <ActivityIndicator color={t.color.accent} />
      </View>
    );
  }

  const isAdmin = conversation.is_admin;

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <FlatList
        data={conversation.participants}
        keyExtractor={(u) => String(u.id)}
        ListHeaderComponent={
          <View>
            <View style={styles.head}>
              <View>
                <Avatar name={conversation.name} size={80} variant="group" square />
                {isAdmin ? (
                  <View style={[styles.camera, { backgroundColor: t.color.accent, borderColor: t.color.bg }]}>
                    <Ionicons name="camera" size={13} color={t.color.textOnAccent} />
                  </View>
                ) : null}
              </View>

              {isAdmin ? (
                <View style={styles.nameRow}>
                  <Input value={name} onChangeText={setName} style={{ flex: 1 }} />
                  {name !== conversation.name ? (
                    <Button title="Saxla" onPress={saveName} loading={savingName} style={{ paddingHorizontal: 14 }} />
                  ) : null}
                </View>
              ) : (
                <Text style={[t.typography.title, { color: t.color.textPrimary, marginTop: 12 }]}>
                  {conversation.name}
                </Text>
              )}
              <Text style={[t.typography.caption, { color: t.color.textSecondary, marginTop: 2 }]}>
                Qrup · {conversation.participants.length} üzv
              </Text>
            </View>

            {isAdmin ? (
              <Pressable
                onPress={() => setAddOpen((v) => !v)}
                style={({ pressed }) => [styles.addRow, { backgroundColor: pressed ? t.color.surfaceAlt : t.color.surface }]}
              >
                <Ionicons name={addOpen ? "close" : "person-add"} size={19} color={t.color.accent} />
                <Text style={[t.typography.body, { fontSize: 15, color: t.color.accent }]}>
                  {addOpen ? "Bağla" : "Üzv əlavə et"}
                </Text>
              </Pressable>
            ) : null}

            {isAdmin && addOpen ? (
              <View style={styles.addBox}>
                <SearchBar value={search} onChangeText={onSearch} placeholder="Üzv axtar" />
                {candidates.map((u) => (
                  <Pressable key={u.id} onPress={() => add(u.id)} style={styles.candidate}>
                    <Avatar name={nameOf(u)} size={36} />
                    <Text style={[t.typography.bodySm, { color: t.color.textPrimary, flex: 1 }]}>
                      {nameOf(u)} · @{u.username}
                    </Text>
                    <Ionicons name="add-circle" size={20} color={t.color.accent} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <SectionHeader title={`Üzvlər (${conversation.participants.length})`} />
          </View>
        }
        renderItem={({ item }) => {
          const memberIsAdmin = conversation.admin_ids.includes(item.id);
          const isMe = item.id === me.id;
          return (
            <View style={[styles.member, { backgroundColor: t.color.surface }]}>
              <Avatar name={nameOf(item)} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[t.typography.bodySm, { fontSize: 15, color: t.color.textPrimary }]}>
                  {nameOf(item)} {isMe ? "(Siz)" : ""}
                </Text>
                <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>@{item.username}</Text>
              </View>
              {memberIsAdmin ? (
                <View style={[styles.badge, { backgroundColor: t.color.accentMuted }]}>
                  <Text style={[t.typography.label, { color: t.color.accent }]}>Admin</Text>
                </View>
              ) : null}
              {isAdmin && !isMe ? (
                <View style={styles.memberActions}>
                  <Pressable onPress={() => toggleAdmin(item.id, !memberIsAdmin)} hitSlop={6}>
                    <Ionicons name={memberIsAdmin ? "shield" : "shield-outline"} size={20} color={t.color.accent} />
                  </Pressable>
                  <Pressable onPress={() => remove(item.id)} hitSlop={6}>
                    <Ionicons name="close-circle-outline" size={20} color={t.color.danger} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: t.color.border }]} />}
        ListFooterComponent={
          <View style={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <Button
              title="Qrupdan ayrıl"
              variant="danger"
              icon={<Ionicons name="exit-outline" size={18} color={t.color.danger} />}
              onPress={() => setConfirmLeave(true)}
            />
          </View>
        }
      />

      <ConfirmDialog
        visible={confirmLeave}
        title="Qrupdan ayrılmaq?"
        message="Bu qrupun mesajlarını artıq görməyəcəksiniz."
        confirmLabel="Ayrıl"
        destructive
        onConfirm={() => {
          setConfirmLeave(false);
          leave();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  head: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 16 },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, alignSelf: "stretch", marginTop: 12 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  addBox: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  candidate: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  member: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  memberActions: { flexDirection: "row", gap: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
});
