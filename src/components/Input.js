import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "../theme";

// IMPORTANT (Android keyboard): this component must NOT re-render or change
// the wrapping View's style in response to focus. A focus-driven setState
// that toggles borderColor / shadowColor on the View around a <TextInput>
// makes Android drop the input connection and dismiss the keyboard the
// instant it opens. So: no `focused` state, static border, no shadow, and
// no `lineHeight` on the TextInput style (also an Android focus hazard).
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
  const [hidden, setHidden] = useState(secureTextEntry);

  const hasError = Boolean(error) || invalid;
  const borderColor = hasError ? t.color.danger : t.color.border;

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
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: t.color.textPrimary, fontFamily: t.typography.body.fontFamily }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.color.textSecondary}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          underlineColorAndroid="transparent"
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
    borderWidth: 1.5,
  },
  input: { flex: 1, paddingVertical: 0, fontSize: 16 },
  eye: { paddingLeft: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  errorText: { fontFamily: "Archivo-Regular", fontSize: 12 },
});
