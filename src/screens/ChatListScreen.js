import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchConversations } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { decryptFromSender, getOrCreateIdentityKeyPair } from "../crypto";

function conversationTitle(conversation, currentUserId) {
  if (conversation.is_group) return conversation.name || "Qrup";
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  if (!other) return "Söhbət";
  return `${other.first_name} ${other.last_name}`.trim() || other.username;
}

function previewFor(conversation, currentUserId, mySecretKey) {
  const last = conversation.last_message;
  if (!last) return "Hələ mesaj yoxdur";
  if (conversation.is_group) return last.text;

  if (!last.ciphertext) return last.text || "";
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  if (!other?.public_key || !mySecretKey) return "🔒 Şifrələnmiş mesaj";
  const decrypted = decryptFromSender(last.ciphertext, last.nonce, other.public_key, mySecretKey);
  return decrypted === null ? "🔒 Şifrələnmiş mesaj" : decrypted;
}

export default function ChatListScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [mySecretKey, setMySecretKey] = useState(null);

  useEffect(() => {
    getOrCreateIdentityKeyPair().then(({ secretKey }) => setMySecretKey(secretKey));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function poll() {
        const { data } = await fetchConversations();
        if (isActive) setConversations(data);
      }

      poll();
      // Keep the list fresh (new messages, unread badges, reordering) while
      // the screen is visible, WhatsApp-style, without needing to re-enter it.
      const interval = setInterval(poll, 4000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const hasUnread = (item.unread_count || 0) > 0;
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("Chat", {
                  conversationId: item.id,
                  title: conversationTitle(item, user.id),
                  isGroup: item.is_group,
                })
              }
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, hasUnread && styles.rowTitleUnread]}>
                  {conversationTitle(item, user.id)}
                </Text>
                <Text
                  style={[styles.rowPreview, hasUnread && styles.rowPreviewUnread]}
                  numberOfLines={1}
                >
                  {previewFor(item, user.id, mySecretKey)}
                </Text>
              </View>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unread_count > 99 ? "99+" : item.unread_count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Söhbət yoxdur. "Yeni" düyməsi ilə başlayın.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#30363d",
  },
  rowText: { flex: 1 },
  rowTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  rowTitleUnread: { fontWeight: "700" },
  rowPreview: { color: "#8b949e", marginTop: 4 },
  rowPreviewUnread: { color: "#e6edf3", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#d4af37",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadBadgeText: { color: "#0d1117", fontSize: 12, fontWeight: "700" },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
});
