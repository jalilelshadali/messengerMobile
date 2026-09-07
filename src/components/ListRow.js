import { Pressable, StyleSheet, Text, View } from "react-native";

import Avatar from "./Avatar";
import { useTheme } from "../theme";

// Söhbət siyahısı sətri. 72dp, avatar 48, ayırıcı 76dp inset.
export default function ListRow({
  name,
  avatarUri,
  group = false,
  online = false,
  preview,
  time,
  unread = 0,
  pinned = false,
  right,
  onPress,
  onLongPress,
}) {
  const t = useTheme();
  const hasUnread = unread > 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          height: t.size.row,
          backgroundColor: hasUnread ? t.color.accentMuted : pressed ? t.color.surfaceAlt : t.color.surface,
        },
      ]}
    >
      {hasUnread ? <View style={[styles.unreadBar, { backgroundColor: t.color.accentLine }]} /> : null}
      <Avatar name={name} uri={avatarUri} size={48} variant={group ? "group" : "user"} online={online} />

      <View style={styles.mid}>
        <Text
          numberOfLines={1}
          style={[
            t.typography.bodySm,
            { fontFamily: hasUnread ? "Archivo-SemiBold" : "Archivo-Regular", color: t.color.textPrimary, fontSize: 16 },
          ]}
        >
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            t.typography.bodySm,
            {
              color: hasUnread ? t.color.textPrimary : t.color.textSecondary,
              fontFamily: hasUnread ? "Archivo-Medium" : "Archivo-Regular",
              marginTop: 2,
            },
          ]}
        >
          {preview}
        </Text>
      </View>

      <View style={styles.rightCol}>
        {time ? (
          <Text style={[t.typography.caption, { color: hasUnread ? t.color.accent : t.color.textSecondary }]}>
            {time}
          </Text>
        ) : null}
        {right}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  unreadBar: { position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  mid: { flex: 1 },
  rightCol: { alignItems: "flex-end", gap: 6, minWidth: 40 },
});
