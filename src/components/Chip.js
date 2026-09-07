import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme";

export default function Chip({ label, selected = false, onPress, style }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: t.radius.pill,
          backgroundColor: selected ? t.color.accentMuted : t.color.surfaceAlt,
          borderColor: selected ? t.color.accent : "transparent",
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: selected ? "Archivo-SemiBold" : "Archivo-Regular",
          fontSize: 13,
          color: t.color.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
