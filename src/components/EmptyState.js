import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import Button from "./Button";
import { useTheme } from "../theme";

export default function EmptyState({ icon = "chatbubbles-outline", title, hint, actionLabel, onAction }) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.icon,
          { backgroundColor: t.color.accentMuted, borderRadius: t.radius.pill },
        ]}
      >
        <Ionicons name={icon} size={22} color={t.color.accent} />
      </View>
      <Text style={[styles.title, { color: t.color.textPrimary }]}>{title}</Text>
      {hint ? (
        <Text style={[t.typography.caption, styles.hint, { color: t.color.textSecondary }]}>{hint}</Text>
      ) : null}
      {actionLabel ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: 16, alignSelf: "stretch" }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontFamily: "Archivo-SemiBold", fontSize: 15, textAlign: "center" },
  hint: { textAlign: "center", marginTop: 6 },
});
