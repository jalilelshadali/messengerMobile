import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Card from "../components/Card";
import ConfirmDialog from "../components/ConfirmDialog";
import Row from "../components/Row";
import { useAuth } from "../context/AuthContext";
import { formatDegree } from "../degrees";
import { useTheme } from "../theme";

export default function ProfileScreen({ navigation }) {
  const t = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const [confirmOut, setConfirmOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <View>
          <Avatar name={fullName} size={88} />
          <View style={[styles.camera, { backgroundColor: t.color.accent, borderColor: t.color.bg }]}>
            <Ionicons name="camera" size={14} color={t.color.textOnAccent} />
          </View>
        </View>
        <Text style={[t.typography.title, { color: t.color.textPrimary, marginTop: 12 }]}>{fullName}</Text>
        <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>@{user.username}</Text>
        {user.section_name ? (
          <View style={[styles.tag, { backgroundColor: t.color.accentMuted }]}>
            <Ionicons name="business-outline" size={12} color={t.color.accent} />
            <Text style={[t.typography.caption, { color: t.color.accent, fontFamily: "Archivo-SemiBold" }]}>
              {user.unit_name} · {user.section_name}
            </Text>
          </View>
        ) : null}
        {user.is_staff ? (
          <View style={[styles.tag, { backgroundColor: t.color.accentMuted }]}>
            <Ionicons name="shield-checkmark" size={12} color={t.color.accent} />
            <Text style={[t.typography.label, { color: t.color.accent }]}>Admin</Text>
          </View>
        ) : null}
      </View>

      <Card padded={false} style={styles.card}>
        <Row type="plain" first icon="ribbon" title={formatDegree(user.degree)} />
        <Row
          type="plain"
          icon="calendar-outline"
          title="Qoşulma tarixi"
          value={new Date(user.joined_at).toLocaleDateString("az-AZ")}
        />
      </Card>

      <Card padded={false} style={styles.card}>
        <Row type="plain" first icon="business-outline" title="Böyük Loja" value={user.unit_name || "Təyin edilməyib"} />
        <Row type="plain" icon="people-outline" title="Möhtərəm Loja" value={user.section_name || "Təyin edilməyib"} />
      </Card>

      <Card padded={false} style={styles.card}>
        <Row first icon="settings-outline" title="Parametrlər" onPress={() => navigation.navigate("Settings")} />
        <Row
          icon="shield-checkmark-outline"
          title="Təhlükəsizlik və cihazlar"
          onPress={() => navigation.navigate("Security")}
        />
      </Card>

      <Button
        title="Çıxış"
        variant="danger"
        icon={<Ionicons name="log-out-outline" size={18} color={t.color.danger} />}
        onPress={() => setConfirmOut(true)}
        style={{ marginTop: 24 }}
      />

      <ConfirmDialog
        visible={confirmOut}
        title="Çıxış edilsin?"
        message="Yenidən daxil olmaq üçün istifadəçi adı və şifrə lazım olacaq. PIN sıfırlanacaq."
        confirmLabel="Çıxış et"
        destructive
        onConfirm={() => {
          setConfirmOut(false);
          logout();
        }}
        onCancel={() => setConfirmOut(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  head: { alignItems: "center", paddingVertical: 16 },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 10 },
  card: { marginTop: 14, overflow: "hidden" },
});
