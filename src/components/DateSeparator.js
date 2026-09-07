import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

export default function DateSeparator({ label }) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: t.color.surfaceAlt, borderRadius: t.radius.pill }]}>
        <Text style={[t.typography.label, { color: t.color.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 4 },
});
