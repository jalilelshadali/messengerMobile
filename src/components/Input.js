import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme";

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  invalid = false,
  secureTextEntry = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  autoFocus = false,
  onSubmitEditing,
  returnKeyType,
  style,
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  const hasError = Boolean(error) || invalid;
  const borderColor = hasError ? t.color.danger : focused ? t.color.accent : t.color.border;

  return (
    <View style={style}>
      {label ? (
        <Text style={[t.typography.label, styles.label, { color: t.color.textSecondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            height: t.size.input,
            borderRadius: t.radius.md,
            backgroundColor: t.color.surface,
            borderColor,
            borderWidth: 1.5,
          },
          focused && !hasError && { shadowColor: t.color.accent },
        ]}
      >
        <TextInput
          style={[t.typography.body, styles.input, { color: t.color.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.color.textSecondary}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} style={styles.eye}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={t.color.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={t.color.danger} />
          <Text style={[styles.errorText, { color: t.color.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 0 },
  eye: { paddingLeft: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  errorText: { fontFamily: "Archivo-Regular", fontSize: 12 },
});
