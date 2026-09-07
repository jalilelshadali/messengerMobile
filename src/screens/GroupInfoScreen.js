import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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

export default function GroupInfoScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const { user: me } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState([]);

  const load = useCallback(() => {
    fetchConversation(conversationId).then(({ data }) => {
      setConversation(data);
      setName(data.name);
    });
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSaveName() {
    if (!name.trim() || name === conversation.name) return;
    setIsSavingName(true);
    try {
      const { data } = await renameConversation(conversationId, name.trim());
      setConversation(data);
      navigation.setOptions({ title: data.name });
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleSearch(text) {
    setSearch(text);
    if (text.trim().length === 0) {
      setCandidates([]);
      return;
    }
    const { data } = await searchUsers(text);
    const memberIds = new Set(conversation.participants.map((p) => p.id));
    setCandidates(data.filter((u) => !memberIds.has(u.id)));
  }

  async function handleAddMember(userId) {
    await addMembers(conversationId, [userId]);
    setSearch("");
    setCandidates([]);
    setIsAddOpen(false);
    load();
  }

  async function handleRemove(userId) {
    await removeMember(conversationId, userId);
    load();
  }

  async function handleToggleAdmin(userId, isAdmin) {
    await setConversationAdmin(conversationId, userId, isAdmin);
    load();
  }

  async function handleLeave() {
    await leaveConversation(conversationId);
    navigation.navigate("ChatList");
  }

  if (!conversation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#d4af37" />
      </View>
    );
  }

  const isAdmin = conversation.is_admin;

  return (
    <View style={styles.container}>
      <View style={styles.nameRow}>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          editable={isAdmin}
          placeholderTextColor="#8b949e"
        />
        {isAdmin && name !== conversation.name && (
          <Pressable style={styles.saveButton} onPress={handleSaveName} disabled={isSavingName}>
            {isSavingName ? (
              <ActivityIndicator color="#0d1117" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Saxla</Text>
            )}
          </Pressable>
        )}
      </View>

      {isAdmin && (
        <Pressable style={styles.addToggle} onPress={() => setIsAddOpen((prev) => !prev)}>
          <Ionicons name="person-add-outline" size={16} color="#d4af37" />
          <Text style={styles.addToggleText}>{isAddOpen ? "Bağla" : "Üzv əlavə et"}</Text>
        </Pressable>
      )}

      {isAdmin && isAddOpen && (
        <View style={styles.addBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Üzv axtar..."
            placeholderTextColor="#8b949e"
            autoCapitalize="none"
            value={search}
            onChangeText={handleSearch}
          />
          {candidates.map((u) => (
            <Pressable key={u.id} style={styles.candidateRow} onPress={() => handleAddMember(u.id)}>
              <Text style={styles.candidateText}>
                {u.first_name} {u.last_name} (@{u.username})
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>ÜZVLƏR ({conversation.participants.length})</Text>
      <FlatList
        data={conversation.participants}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const memberIsAdmin = conversation.admin_ids.includes(item.id);
          return (
            <View style={styles.memberRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {item.first_name} {item.last_name} {item.id === me.id ? "(Siz)" : ""}
                </Text>
                <Text style={styles.memberUsername}>@{item.username}</Text>
              </View>
              {memberIsAdmin && <Text style={styles.adminBadge}>Admin</Text>}
              {isAdmin && item.id !== me.id && (
                <View style={styles.memberActions}>
                  <Pressable onPress={() => handleToggleAdmin(item.id, !memberIsAdmin)}>
                    <Ionicons
                      name={memberIsAdmin ? "shield" : "shield-outline"}
                      size={20}
                      color="#d4af37"
                    />
                  </Pressable>
                  <Pressable onPress={() => handleRemove(item.id)}>
                    <Ionicons name="close-circle-outline" size={20} color="#f85149" />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />

      <Pressable style={styles.leaveButton} onPress={handleLeave}>
        <Ionicons name="exit-outline" size={18} color="#f85149" />
        <Text style={styles.leaveButtonText}>Qrupdan ayrıl</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  center: { flex: 1, backgroundColor: "#0d1117", justifyContent: "center", alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  nameInput: {
    flex: 1,
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    fontWeight: "700",
  },
  saveButton: { backgroundColor: "#d4af37", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  saveButtonText: { color: "#0d1117", fontWeight: "700", fontSize: 12 },
  addToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  addToggleText: { color: "#d4af37", fontSize: 13 },
  addBox: { paddingHorizontal: 16, marginBottom: 12 },
  searchInput: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 6,
  },
  candidateRow: { paddingVertical: 8 },
  candidateText: { color: "#fff", fontSize: 13 },
  sectionLabel: {
    color: "#8b949e",
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  memberName: { color: "#fff", fontWeight: "600" },
  memberUsername: { color: "#8b949e", fontSize: 12, marginTop: 2 },
  adminBadge: {
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  memberActions: { flexDirection: "row", gap: 10 },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  leaveButtonText: { color: "#f85149", fontWeight: "600" },
});
