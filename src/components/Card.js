import { StyleSheet, View } from "react-native";

import { useTheme } from "../theme";

export default function Card({ children, style, padded = true }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.color.surface,
          borderColor: t.color.border,
          borderRadius: t.radius.lg,
          padding: padded ? t.spacing.lg : 0,
        },
        t.shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
});
