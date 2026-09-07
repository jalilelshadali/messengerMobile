import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

// variant: "primary" | "secondary" | "ghost" | "danger"
export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon = null, // <Ionicons .../> — mətnin solunda
  style,
}) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: t.radius.md, minHeight: t.size.button },
        variantContainer(t, variant, pressed),
        isDisabled && { opacity: 0.4 },
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? t.color.textOnAccent : t.color.accent}
          style={styles.spinner}
        />
      )}
      {!loading && icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[t.typography.title, styles.label, { color: labelColor(t, variant) }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

function variantContainer(t, variant, pressed) {
  switch (variant) {
    case "secondary":
      return {
        backgroundColor: pressed ? t.color.surfaceAlt : t.color.surface,
        borderWidth: 1.5,
        borderColor: t.color.border,
      };
    case "ghost":
      return { backgroundColor: pressed ? t.color.surfaceAlt : "transparent" };
    case "danger":
      return {
        backgroundColor: pressed ? t.color.danger : "transparent",
        borderWidth: 1.5,
        borderColor: t.color.danger,
      };
    case "primary":
    default:
      return { backgroundColor: pressed ? t.color.accentPressed : t.color.accent };
  }
}

function labelColor(t, variant) {
  if (variant === "primary") return t.color.textOnAccent;
  if (variant === "danger") return t.color.danger;
  return t.color.textPrimary;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  label: { fontSize: 15, textAlign: "center" },
  spinner: { position: "absolute", left: 16 },
  icon: { marginRight: 8 },
});
