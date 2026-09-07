import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

// Oxunmamış sayğac / kiçik nişan. count > 99 -> "99+".
export default function Badge({ count, label, tone = "accent" }) {
  const t = useTheme();
  if (count != null && count <= 0) return null;

  const bg =
    tone === "danger" ? t.color.danger : tone === "success" ? t.color.success : t.color.accent;
  const text = label != null ? label : count > 99 ? "99+" : String(count);

  return (
    <View style={[styles.base, { backgroundColor: bg, borderRadius: t.radius.pill }]}>
      <Text style={[styles.text, { color: t.color.textOnAccent }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: "Archivo-SemiBold", fontSize: 11, lineHeight: 14 },
});
