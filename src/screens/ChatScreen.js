import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DateSeparator from "../components/DateSeparator";
import MessageBubble from "../components/MessageBubble";
import {
  fetchConversation,
  fetchMessages,
  markConversationRead,
  sendEncryptedMessage,
  sendGroupMessage,
} from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { decryptFromSender, encryptForRecipient, getOrCreateIdentityKeyPair } from "../crypto";
import { dateSeparatorLabel, dayKey, messageTime } from "../lib/format";
import { rememberMessages } from "../lib/messageStore";
import { useTheme } from "../theme";

const GROUP_GAP_MS = 3 * 60 * 1000;

function decryptDirect(message, otherPublicKey, mySecretKey) {
  if (!message.ciphertext) return message.text || "";
  if (!otherPublicKey) return null;
  return decryptFromSender(message.ciphertext, message.nonce, otherPublicKey, mySecretKey);
}

// Mesajları tarix ayırıcıları + qruplaşma məlumatı ilə düz siyahıya çevirir.
function buildItems(messages, meId) {
  const out = [];
  let lastDay = null;
  messages.forEach((m, i) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      out.push({ type: "date", id: `d-${k}`, label: dateSeparatorLabel(m.created_at) });
      lastDay = k;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameAsPrev =
      prev &&
      prev.sender.id === m.sender.id &&
      dayKey(prev.created_at) === k &&
      new Date(m.created_at) - new Date(prev.created_at) < GROUP_GAP_MS;
    const sameAsNext =
      next &&
      next.sender.id === m.sender.id &&
      dayKey(next.created_at) === k &&
      new Date(next.created_at) - new Date(m.created_at) < GROUP_GAP_MS;
    let grouped = "single";
    if (sameAsPrev && sameAsNext) grouped = "middle";
    else if (sameAsPrev) grouped = "last";
    else if (sameAsNext) grouped = "first";
    out.push({ type: "msg", id: `m-${m.id}`, message: m, grouped, showSender: !sameAsPrev });
  });
  return out;
}

export default function ChatScreen({ route, navigation }) {
  const { conversationId, title, isGroup } = route.params;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherPublicKey, setOtherPublicKey] = useState(null);
  const [mySecretKey, setMySecretKey] = useState(null);
  const [presence, setPresence] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { secretKey } = await getOrCreateIdentityKeyPair();
      if (!active) return;
      setMySecretKey(secretKey);
      const { data } = await fetchConversation(conversationId);
      if (!active) return;
      if (isGroup) {
        setPresence(`${data.participants.length} üzv`);
      } else {
        const other = data.participants.find((p) => p.id !== user.id);
        setOtherPublicKey(other?.public_key || "");
        setPresence("uçdan-uca şifrəli");
      }
    })();
    return () => {
      active = false;
    };
  }, [conversationId, isGroup, user.id]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const { data } = await fetchMessages(conversationId);
        if (active) setMessages(data);
        markConversationRead(conversationId).catch(() => {});
      } catch {
        /* offline */
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [conversationId]);

  const items = useMemo(() => buildItems(messages, user.id), [messages, user.id]);

  // Söhbət lentini axtarış üçün lokal indeksə yaz (deşifrə edilmiş mətnlə).
  useEffect(() => {
    if (!messages.length) return;
    if (!isGroup && !mySecretKey) return;
    const decoded = messages
      .map((m) => {
        const body = isGroup ? m.text : decryptDirect(m, otherPublicKey, mySecretKey);
        if (!body) return null;
        return {
          id: m.id,
          text: body,
          from: m.sender.first_name || m.sender.username,
          at: m.created_at,
          mine: m.sender.id === user.id,
        };
      })
      .filter(Boolean);
    rememberMessages(conversationId, { name: title, isGroup }, decoded);
  }, [messages, isGroup, otherPublicKey, mySecretKey, conversationId, title, user.id]);

  async function handleSend() {
    const value = text.trim();
    if (!value) return;
    Keyboard.dismiss();

    if (isGroup) {
      setText("");
      const { data } = await sendGroupMessage(conversationId, value);
      setMessages((prev) => [...prev, data]);
      return;
    }
    if (!otherPublicKey) return;
    setText("");
    const { ciphertext, nonce } = encryptForRecipient(value, otherPublicKey, mySecretKey);
    const { data } = await sendEncryptedMessage(conversationId, ciphertext, nonce);
    setMessages((prev) => [...prev, data]);
  }

  async function handleCopy(value, id) {
    await Clipboard.setStringAsync(value);
    Haptics.selectionAsync().catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((p) => (p === id ? null : p)), 1400);
  }

  const blocked = !isGroup && !otherPublicKey && mySecretKey;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: t.color.surface, borderBottomColor: t.color.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={t.color.accent} />
        </Pressable>
        <View
          style={[
            styles.hAvatar,
            { backgroundColor: isGroup ? t.color.accentMuted : t.color.surfaceAlt },
          ]}
        >
          {isGroup ? (
            <Ionicons name="people" size={20} color={t.color.accent} />
          ) : (
            <Text style={{ fontFamily: "Archivo-SemiBold", color: t.color.textPrimary }}>
              {(title || "?").trim()[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <Pressable
          style={styles.hText}
          onPress={() => isGroup && navigation.navigate("GroupInfo", { conversationId })}
        >
          <Text numberOfLines={1} style={[t.typography.title, { fontSize: 16, color: t.color.textPrimary }]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[t.typography.caption, { color: t.color.textSecondary }]}>
            {presence}
          </Text>
        </Pressable>
        {isGroup ? (
          <Pressable onPress={() => navigation.navigate("GroupInfo", { conversationId })} hitSlop={10}>
            <Ionicons name="information-circle-outline" size={24} color={t.color.accent} />
          </Pressable>
        ) : null}
      </View>

      {blocked ? (
        <View style={[styles.banner, { backgroundColor: t.color.accentMuted }]}>
          <Ionicons name="lock-open-outline" size={14} color={t.color.danger} />
          <Text style={[t.typography.caption, { color: t.color.danger, flex: 1 }]}>
            Qarşı tərəf hələ təhlükəsiz açar yaratmayıb — mesajlaşma bloklanıb.
          </Text>
        </View>
      ) : (
        <View style={styles.e2eePill}>
          <View style={[styles.pill, { backgroundColor: t.color.accentMuted }]}>
            <Ionicons name="lock-closed" size={12} color={t.color.accent} />
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
              {isGroup ? "Qrup mesajları hələ E2EE deyil" : "Mesajlar uçdan-uca şifrələnir"}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
        renderItem={({ item }) => {
          if (item.type === "date") return <DateSeparator label={item.label} />;
          const m = item.message;
          const mine = m.sender.id === user.id;
          const body = isGroup ? m.text : decryptDirect(m, otherPublicKey, mySecretKey);
          const undecryptable = !isGroup && body === null;
          return (
            <MessageBubble
              text={copiedId === m.id ? "Kopyalandı ✓" : body}
              mine={mine}
              senderName={m.sender.first_name || m.sender.username}
              showSender={isGroup && item.showSender}
              grouped={item.grouped}
              time={messageTime(m.created_at)}
              status={mine ? "sent" : undefined}
              undecryptable={undecryptable}
              onLongPress={() => !undecryptable && handleCopy(body, m.id)}
            />
          );
        }}
      />

      <View style={[styles.inputRow, { backgroundColor: t.color.surface, borderTopColor: t.color.border, paddingBottom: insets.bottom || 8 }]}>
        <Pressable hitSlop={8} style={styles.plus}>
          <Ionicons name="add" size={24} color={t.color.textSecondary} />
        </Pressable>
        <TextInput
          style={[
            t.typography.body,
            styles.input,
            { backgroundColor: t.color.surfaceAlt, color: t.color.textPrimary, borderRadius: t.radius.lg },
          ]}
          placeholder="Mesaj yazın"
          placeholderTextColor={t.color.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          editable={!blocked}
        />
        <Pressable
          onPress={handleSend}
          style={[styles.send, { backgroundColor: t.color.accent }]}
          hitSlop={6}
        >
          <Ionicons name={text.trim() ? "send" : "mic"} size={18} color={t.color.textOnAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 2 },
  hAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hText: { flex: 1 },
  banner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  e2eePill: { alignItems: "center", paddingVertical: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  plus: { height: 40, justifyContent: "center" },
  input: { flex: 1, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 9 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
