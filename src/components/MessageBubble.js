import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

function StatusIcon({ status, color }) {
  const map = {
    sending: "time-outline",
    sent: "checkmark",
    delivered: "checkmark-done",
    read: "checkmark-done",
    failed: "alert-circle",
  };
  const name = map[status];
  if (!name) return null;
  return <Ionicons name={name} size={13} color={color} style={{ marginLeft: 3 }} />;
}

// grouped: "single" | "first" | "middle" | "last" — künc radiuslarını dəyişir.
export default function MessageBubble({
  text,
  mine,
  senderName,
  time,
  status,
  showSender = false,
  grouped = "single",
  undecryptable = false,
  onLongPress,
}) {
  const t = useTheme();

  const big = t.radius.lg;
  const small = 6;
  const corners = mine
    ? {
        borderTopLeftRadius: big,
        borderBottomLeftRadius: big,
        borderTopRightRadius: grouped === "first" || grouped === "single" ? big : small,
        borderBottomRightRadius: grouped === "last" || grouped === "single" ? big : small,
      }
    : {
        borderTopRightRadius: big,
        borderBottomRightRadius: big,
        borderTopLeftRadius: grouped === "first" || grouped === "single" ? big : small,
        borderBottomLeftRadius: grouped === "last" || grouped === "single" ? big : small,
      };

  const statusColor = status === "failed" ? t.color.danger : status === "read" ? t.color.success : t.color.textSecondary;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.bubble,
        corners,
        {
          alignSelf: mine ? "flex-end" : "flex-start",
          backgroundColor: mine ? t.color.bubbleMine : t.color.bubbleOther,
          borderWidth: mine ? 0 : 1,
          borderColor: t.color.border,
          marginTop: grouped === "middle" || grouped === "last" ? 2 : 8,
        },
      ]}
    >
      {showSender && !mine && senderName ? (
        <Text style={[styles.sender, { color: t.color.accent }]}>{senderName}</Text>
      ) : null}

      <Text
        style={[
          t.typography.body,
          { color: undecryptable ? t.color.textSecondary : t.color.textPrimary, fontStyle: undecryptable ? "italic" : "normal" },
        ]}
      >
        {undecryptable ? "🔒 Mesaj deşifrə edilə bilmədi" : text}
      </Text>

      <View style={styles.meta}>
        <Text style={[styles.time, { color: t.color.textSecondary }]}>{time}</Text>
        {mine ? <StatusIcon status={status} color={statusColor} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8 },
  sender: { fontFamily: "Archivo-SemiBold", fontSize: 12, marginBottom: 2 },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 3 },
  time: { fontFamily: "Archivo-Regular", fontSize: 10 },
});
