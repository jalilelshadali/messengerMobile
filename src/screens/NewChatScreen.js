import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { searchUsers } from "../api/auth";
import { createGroupConversation, startDirectConversation } from "../api/chat";
import { useAuth } from "../context/AuthContext";

export default function NewChatScreen({ navigation }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchUsers(search).then(({ data }) => setUsers(data));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  async function openDirectChat(otherUser) {
    const { data } = await startDirectConversation(otherUser.id);
    navigation.replace("Chat", { conversationId: data.id, title: otherUser.username });
  }

  function toggle(userId) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleStart() {
    if (selected.length === 1) {
      const other = users.find((u) => u.id === selected[0]);
      await openDirectChat(other);
    } else if (selected.length > 1) {
      const { data } = await createGroupConversation(groupName || "Qrup", selected);
      navigation.replace("Chat", { conversationId: data.id, title: data.name, isGroup: true });
    }
  }

  if (!me.is_staff) {
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Üzv axtar..."
          placeholderTextColor="#8b949e"
          autoCapitalize="none"
          value={search}
          onChangeText={setSearch}
        />
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openDirectChat(item)}>
              <Text style={styles.rowTitle}>
                {item.first_name} {item.last_name}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Üzv tapılmadı</Text>}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Üzv axtar..."
        placeholderTextColor="#8b949e"
        autoCapitalize="none"
        value={search}
        onChangeText={setSearch}
      />
      {selected.length > 1 && (
        <TextInput
          style={styles.input}
          placeholder="Qrup adı"
          placeholderTextColor="#8b949e"
          value={groupName}
          onChangeText={setGroupName}
        />
      )}
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => toggle(item.id)}>
            <Text style={styles.rowTitle}>
              {selected.includes(item.id) ? "☑ " : "☐ "}
              {item.first_name} {item.last_name}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Üzv tapılmadı</Text>}
      />
      {selected.length > 0 && (
        <Pressable style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>{selected.length === 1 ? "Söhbətə başla" : "Qrup yarat"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117", padding: 12 },
  input: {
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#30363d" },
  rowTitle: { color: "#fff" },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 24 },
  button: { backgroundColor: "#d4af37", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#0d1117", fontWeight: "700" },
});
