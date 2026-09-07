import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Badge from "../components/Badge";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import ListRow from "../components/ListRow";
import SearchBar from "../components/SearchBar";
import SectionHeader from "../components/SectionHeader";
import { fetchConversations } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { decryptFromSender, getOrCreateIdentityKeyPair } from "../crypto";
import { chatListTime } from "../lib/format";
import { useTheme } from "../theme";

const PINNED_KEY = "chat.pinnedIds";

function conversationTitle(c, meId) {
  if (c.is_group) return c.name || "Qrup";
  const other = c.participants.find((p) => p.id !== meId);
  if (!other) return "Söhbət";
  return `${other.first_name || ""} ${other.last_name || ""}`.trim() || other.username;
}

function previewFor(c, meId, mySecretKey) {
  const last = c.last_message;
  if (!last) return "Hələ mesaj yoxdur";
  if (c.is_group) return last.text || "";
  if (!last.ciphertext) return last.text || "";
  const other = c.participants.find((p) => p.id !== meId);
  if (!other?.public_key || !mySecretKey) return "🔒 Şifrələnmiş mesaj";
  const decrypted = decryptFromSender(last.ciphertext, last.nonce, other.public_key, mySecretKey);
  return decrypted === null ? "🔒 Şifrələnmiş mesaj" : decrypted;
}

export default function ChatListScreen({ navigation }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [mySecretKey, setMySecretKey] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | unread | groups
  const [pinnedIds, setPinnedIds] = useState([]);

  useEffect(() => {
    getOrCreateIdentityKeyPair().then(({ secretKey }) => setMySecretKey(secretKey));
    AsyncStorage.getItem(PINNED_KEY).then((raw) => {
      try {
        setPinnedIds(raw ? JSON.parse(raw) : []);
      } catch {
        setPinnedIds([]);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function poll() {
        try {
          const { data } = await fetchConversations();
          if (active) setConversations(data);
        } catch {
          /* offline — köhnə siyahı qalsın */
        }
      }
      poll();
      const id = setInterval(poll, 4000);
      return () => {
        active = false;
        clearInterval(id);
      };
    }, [])
  );

  function togglePin(convId) {
    setPinnedIds((prev) => {
      const next = prev.includes(convId) ? prev.filter((x) => x !== convId) : [...prev, convId];
      AsyncStorage.setItem(PINNED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  const unreadTotal = conversations.reduce((n, c) => n + (c.unread_count || 0), 0);

  const rows = conversations
    .map((c) => ({
      conv: c,
      title: conversationTitle(c, user.id),
      preview: previewFor(c, user.id, mySecretKey),
      time: chatListTime(c.last_message?.created_at),
      unread: c.unread_count || 0,
      pinned: pinnedIds.includes(c.id),
    }))
    .filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "unread") return r.unread > 0;
      if (filter === "groups") return r.conv.is_group;
      return true;
    });

  const pinned = rows.filter((r) => r.pinned);
  const rest = rows.filter((r) => !r.pinned);

  function renderRow(r) {
    return (
      <ListRow
        key={r.conv.id}
        name={r.title}
        group={r.conv.is_group}
        preview={r.preview}
        time={r.time}
        unread={r.unread}
        pinned={r.pinned}
        right={r.unread > 0 ? <Badge count={r.unread} tone="accent" /> : null}
        onPress={() =>
          navigation.navigate("Chat", {
            conversationId: r.conv.id,
            title: r.title,
            isGroup: r.conv.is_group,
          })
        }
        onLongPress={() => togglePin(r.conv.id)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.color.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[t.typography.display, { color: t.color.textPrimary }]}>Söhbətlər</Text>
        <View style={styles.headerBtns}>
          <Pressable
            onPress={() => navigation.navigate("NewChat")}
            style={[styles.roundBtn, { backgroundColor: t.color.accent }]}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={19} color={t.color.textOnAccent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.controls}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Söhbətlərdə axtar" />
        <View style={styles.chips}>
          <Chip label="Hamısı" selected={filter === "all"} onPress={() => setFilter("all")} />
          <Chip
            label={unreadTotal > 0 ? `Oxunmamış ${unreadTotal}` : "Oxunmamış"}
            selected={filter === "unread"}
            onPress={() => setFilter("unread")}
          />
          <Chip label="Qruplar" selected={filter === "groups"} onPress={() => setFilter("groups")} />
        </View>
      </View>

      <FlatList
        data={rest}
        keyExtractor={(r) => String(r.conv.id)}
        renderItem={({ item }) => renderRow(item)}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: t.color.border }]} />
        )}
        ListHeaderComponent={
          pinned.length ? (
            <View>
              <SectionHeader title="Sabitlənmiş" />
              {pinned.map(renderRow)}
              <SectionHeader title="Bütün söhbətlər" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={search || filter !== "all" ? "Uyğun söhbət yoxdur" : "Hələ söhbət yoxdur"}
            hint={search || filter !== "all" ? "Filtri dəyişin" : '"Yeni" düyməsi ilə başlayın'}
            actionLabel={search || filter !== "all" ? null : "Yeni söhbət"}
            onAction={() => navigation.navigate("NewChat")}
          />
        }
        contentContainerStyle={rest.length ? null : { flexGrow: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerBtns: { flexDirection: "row", gap: 8 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  chips: { flexDirection: "row", gap: 8 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
});
