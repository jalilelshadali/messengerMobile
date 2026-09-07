import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useTheme } from "../theme";

export default function SearchBar({ value, onChangeText, placeholder = "Axtar", autoFocus = false, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: t.color.surfaceAlt, borderRadius: t.radius.pill, height: t.size.search },
        style,
      ]}
    >
      <Ionicons name="search" size={17} color={t.color.textSecondary} />
      <TextInput
        style={[t.typography.bodySm, styles.input, { color: t.color.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.color.textSecondary}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={t.color.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, paddingVertical: 0 },
});
