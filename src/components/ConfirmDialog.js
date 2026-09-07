import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Button from "./Button";
import { useTheme } from "../theme";

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Təsdiqlə",
  cancelLabel = "Ləğv et",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.color.overlay }]} onPress={onCancel}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: t.color.surface, borderRadius: t.radius.lg, borderColor: t.color.border },
            t.shadow.lg,
          ]}
        >
          <Text style={[t.typography.title, { color: t.color.textPrimary }]}>{title}</Text>
          {message ? (
            <Text style={[t.typography.body, styles.msg, { color: t.color.textSecondary }]}>{message}</Text>
          ) : null}
          <View style={styles.actions}>
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} style={styles.btn} />
            <Button
              title={confirmLabel}
              variant={destructive ? "danger" : "primary"}
              onPress={onConfirm}
              style={styles.btn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  card: { width: "100%", maxWidth: 320, padding: 20, borderWidth: 1 },
  msg: { marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  btn: { flex: 1 },
});
