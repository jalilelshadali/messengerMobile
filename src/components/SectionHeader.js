import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

export default function SectionHeader({ title, right }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: t.color.bg }]}>
      <Text style={[t.typography.label, { color: t.color.textSecondary }]}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
});
