import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchConversation, fetchMessages, markConversationRead, sendEncryptedMessage, sendGroupMessage } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { decryptFromSender, encryptForRecipient, getOrCreateIdentityKeyPair } from "../crypto";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
}

// For a direct (1:1) conversation, both sending and decrypting always use the
// same counterparty key: the OTHER participant's public key. Curve25519's
// Diffie-Hellman shared secret is symmetric — DH(mySecret, theirPublic) ==
// DH(theirSecret, myPublic) — so this same key pairing decrypts messages
// regardless of who sent them.
function decryptDirectMessage(message, otherPublicKey, mySecretKey) {
  if (!message.ciphertext) return message.text || "";
  if (!otherPublicKey) return null;
  return decryptFromSender(message.ciphertext, message.nonce, otherPublicKey, mySecretKey);
}

export default function ChatScreen({ route, navigation }) {
  const { conversationId, title, isGroup } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [otherPublicKey, setOtherPublicKey] = useState(null);
  const [mySecretKey, setMySecretKey] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title,
      headerRight: isGroup
        ? () => (
            <Pressable onPress={() => navigation.navigate("GroupInfo", { conversationId })} hitSlop={10}>
              <Ionicons name="information-circle-outline" size={24} color="#d4af37" />
            </Pressable>
          )
        : undefined,
    });
  }, [title, isGroup]);

  useEffect(() => {
    const showEvent = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvent = Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function setupKeys() {
      const { secretKey } = await getOrCreateIdentityKeyPair();
      if (!isActive) return;
      setMySecretKey(secretKey);

      if (!isGroup) {
        const { data } = await fetchConversation(conversationId);
        const other = data.participants.find((p) => p.id !== user.id);
        if (isActive) setOtherPublicKey(other?.public_key || "");
      }
    }

    setupKeys();
    return () => {
      isActive = false;
    };
  }, [conversationId, isGroup]);

  useEffect(() => {
    let isActive = true;

    async function poll() {
      const { data } = await fetchMessages(conversationId);
      if (isActive) setMessages(data);
      // The chat is open and on screen, so any new messages fetched here are
      // immediately "read" — clear the unread badge on the chat list for it.
      markConversationRead(conversationId).catch(() => {});
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [conversationId]);

  async function handleSend() {
    const value = text.trim();
    if (!value) return;

    if (isGroup) {
      setText("");
      const { data } = await sendGroupMessage(conversationId, value);
      setMessages((prev) => [...prev, data]);
      return;
    }

    if (!otherPublicKey) {
      return;
    }
    setText("");
    const { ciphertext, nonce } = encryptForRecipient(value, otherPublicKey, mySecretKey);
    const { data } = await sendEncryptedMessage(conversationId, ciphertext, nonce);
    setMessages((prev) => [...prev, data]);
  }

  async function handleCopy(displayText, messageId) {
    await Clipboard.setStringAsync(displayText);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId((prev) => (prev === messageId ? null : prev)), 1500);
  }

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      {!isGroup && !otherPublicKey && mySecretKey && (
        <View style={styles.warningBanner}>
          <Ionicons name="lock-open-outline" size={14} color="#f85149" />
          <Text style={styles.warningText}>Qarşı tərəf hələ təhlükəsiz açar yaratmayıb, mesajlaşma bloklanıb.</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.sender.id === user.id;
          const displayText = isGroup ? item.text : decryptDirectMessage(item, otherPublicKey, mySecretKey);
          const isUndecryptable = !isGroup && displayText === null;
          return (
            <Pressable
              onLongPress={() => !isUndecryptable && handleCopy(displayText, item.id)}
              style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              {!isMine && <Text style={styles.sender}>{item.sender.username}</Text>}
              <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                {isUndecryptable ? "🔒 Mesaj deşifrə edilə bilmədi" : displayText}
              </Text>
              <Text style={isMine ? styles.timeMine : styles.timeTheirs}>
                {copiedId === item.id ? "Kopyalandı ✓" : formatTime(item.created_at)}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={{ padding: 12 }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mesaj yazın..."
          placeholderTextColor="#8b949e"
          value={text}
          onChangeText={setText}
        />
        <Pressable style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Göndər</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2d1214",
    padding: 10,
  },
  warningText: { color: "#f85149", fontSize: 12, flex: 1 },
  bubble: { maxWidth: "80%", borderRadius: 10, padding: 10, marginBottom: 8 },
  bubbleMine: { backgroundColor: "#d4af37", alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: "#161b22", alignSelf: "flex-start" },
  sender: { fontSize: 11, color: "#8b949e", marginBottom: 2 },
  bubbleTextMine: { color: "#0d1117" },
  bubbleTextTheirs: { color: "#fff" },
  timeMine: { color: "#0d1117", opacity: 0.6, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  timeTheirs: { color: "#8b949e", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  inputRow: { flexDirection: "row", padding: 8, borderTopWidth: 1, borderTopColor: "#30363d" },
  input: {
    flex: 1,
    backgroundColor: "#161b22",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  sendButton: { backgroundColor: "#d4af37", borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" },
  sendButtonText: { color: "#0d1117", fontWeight: "700" },
});
