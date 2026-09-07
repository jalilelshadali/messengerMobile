import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

function initialsOf(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// size: number (dp). variant: "user" | "group". online: bool.
export default function Avatar({ name, uri, size = 48, variant = "user", online = false, square = false }) {
  const t = useTheme();
  const radius = square ? Math.round(size * 0.28) : size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius, backgroundColor: t.color.surfaceAlt }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: variant === "group" ? t.color.accentMuted : t.color.surfaceAlt,
            },
          ]}
        >
          {variant === "group" ? (
            <Ionicons name="people" size={size * 0.5} color={t.color.accent} />
          ) : (
            <Text
              style={{
                fontFamily: "Archivo-SemiBold",
                fontSize: size * 0.36,
                color: t.color.textPrimary,
              }}
            >
              {initialsOf(name)}
            </Text>
          )}
        </View>
      )}

      {online ? (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.26,
              height: size * 0.26,
              borderRadius: size * 0.13,
              backgroundColor: t.color.success,
              borderColor: t.color.surface,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", right: 0, bottom: 0, borderWidth: 2 },
});
