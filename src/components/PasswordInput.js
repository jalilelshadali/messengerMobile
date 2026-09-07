import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function PasswordInput({ placeholder, value, onChangeText }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#8b949e"
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable style={styles.toggle} onPress={() => setIsVisible((prev) => !prev)}>
        <Text style={styles.toggleText}>{isVisible ? "Gizlət" : "Göstər"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161b22",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    padding: 14,
  },
  toggle: {
    paddingHorizontal: 12,
  },
  toggleText: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "600",
  },
});
