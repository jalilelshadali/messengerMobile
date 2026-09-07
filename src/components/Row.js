import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Toggle from "./Toggle";
import { useTheme } from "../theme";

// type: "nav" | "select" | "toggle" | "plain"
export default function Row({
  icon,
  iconColor,
  title,
  hint,
  value,
  type = "nav",
  toggleValue,
  onToggle,
  onPress,
  destructive = false,
  first = false,
  last = false,
}) {
  const t = useTheme();
  const titleColor = destructive ? t.color.danger : t.color.textPrimary;

  const body = (
    <View
      style={[
        styles.row,
        {
          minHeight: hint ? t.size.rowSettingWithHint : t.size.rowSetting,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: t.color.border,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={19} color={iconColor || (destructive ? t.color.danger : t.color.textSecondary)} style={styles.icon} />
      ) : null}
      <View style={styles.mid}>
        <Text style={[t.typography.body, { fontSize: 15, color: titleColor }]}>{title}</Text>
        {hint ? (
          <Text style={[t.typography.caption, { color: t.color.textSecondary, marginTop: 1 }]}>{hint}</Text>
        ) : null}
      </View>

      {type === "toggle" ? (
        <Toggle value={toggleValue} onValueChange={onToggle} />
      ) : null}
      {type === "plain" && value ? (
        <Text style={[t.typography.body, { fontSize: 15, color: t.color.textSecondary }]}>{value}</Text>
      ) : null}
      {type === "select" ? (
        <View style={styles.right}>
          {value ? <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} />
        </View>
      ) : null}
      {type === "nav" ? <Ionicons name="chevron-forward" size={16} color={t.color.textSecondary} /> : null}
    </View>
  );

  if (type === "toggle" || type === "plain") return body;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: t.color.surfaceAlt }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  icon: { width: 22 },
  mid: { flex: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 4 },
});
