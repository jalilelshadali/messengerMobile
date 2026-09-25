import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text, View } from "react-native";

import Avatar from "./Avatar";
import BottomSheet from "./BottomSheet";
import Button from "./Button";
import Row from "./Row";
import { formatDegree } from "../degrees";
import { useTheme } from "../theme";

function nameOf(u) {
  return `${u?.first_name || ""} ${u?.last_name || ""}`.trim() || u?.username || "";
}

const MUTE_PREFIX = "chat.muted:";

export default function PeerProfileSheet({ visible, onClose, user, conversationId }) {
  const t = useTheme();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    AsyncStorage.getItem(`${MUTE_PREFIX}${conversationId}`).then((v) => setMuted(v === "1"));
  }, [conversationId, visible]);

  function toggleMute(next) {
    setMuted(next);
    AsyncStorage.setItem(`${MUTE_PREFIX}${conversationId}`, next ? "1" : "0").catch(() => {});
  }

  if (!user) return null;

  const chips = [];
  chips.push(formatDegree(user.degree));
  if (user.joined_at) chips.push(`Üzv: ${new Date(user.joined_at).getFullYear()}`);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Avatar name={nameOf(user)} size={72} />
        <Text style={[t.typography.title, { color: t.color.textPrimary, marginTop: 10 }]}>{nameOf(user)}</Text>
        <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>@{user.username}</Text>
        {user.is_staff ? (
          <View style={[styles.tag, { backgroundColor: t.color.accentMuted }]}>
            <Ionicons name="shield-checkmark" size={12} color={t.color.accent} />
            <Text style={[t.typography.label, { color: t.color.accent }]}>Admin</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chips}>
        {chips.map((c, i) => (
          <View
            key={i}
            style={[
              styles.chip,
              { backgroundColor: i === 0 ? t.color.accentMuted : t.color.surfaceAlt },
            ]}
          >
            <Text style={[t.typography.caption, { color: t.color.textPrimary }]}>{c}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { borderColor: t.color.border }]}>
        <Row type="plain" first icon="business-outline" title="Böyük Loja" value={user.unit_name || "Təyin edilməyib"} />
        <Row type="plain" icon="people-outline" title="Möhtərəm Loja" value={user.section_name || "Təyin edilməyib"} />
        <Row
          type="toggle"
          icon="notifications-off-outline"
          title="Səssiz et"
          hint="Bu cihazda bildiriş gəlməsin"
          toggleValue={muted}
          onToggle={toggleMute}
        />
      </View>

      <Button title="Bağla" variant="secondary" onPress={onClose} style={{ marginTop: 16 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", paddingBottom: 4 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderWidth: 1, borderRadius: 16, marginTop: 18, overflow: "hidden" },
});
