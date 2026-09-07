import { ScrollView, StyleSheet, Text } from "react-native";

import Card from "../components/Card";
import Row from "../components/Row";
import SectionHeader from "../components/SectionHeader";
import { useSettings } from "../context/SettingsContext";
import { useTheme } from "../theme";

const THEME_LABEL = { system: "Sistem", light: "İşıqlı", dark: "Qaranlıq" };
const THEME_NEXT = { system: "light", light: "dark", dark: "system" };

export default function SettingsScreen({ navigation }) {
  const t = useTheme();
  const { settings, setSetting } = useSettings();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={styles.content}>
      <SectionHeader title="Görünüş" />
      <Card padded={false} style={styles.card}>
        <Row
          first
          type="select"
          icon="color-palette-outline"
          title="Tema"
          value={THEME_LABEL[settings.themeMode]}
          onPress={() => setSetting("themeMode", THEME_NEXT[settings.themeMode])}
        />
        <Row type="select" icon="language-outline" title="Dil" value="Azərbaycan" onPress={() => {}} />
      </Card>

      <SectionHeader title="Bildirişlər" />
      <Card padded={false} style={styles.card}>
        <Row
          first
          type="toggle"
          icon="notifications-outline"
          title="Push bildirişləri"
          toggleValue={settings.notifications}
          onToggle={(v) => setSetting("notifications", v)}
        />
        <Row
          type="toggle"
          icon="volume-high-outline"
          title="Səs"
          toggleValue={settings.sound}
          onToggle={(v) => setSetting("sound", v)}
        />
      </Card>

      <SectionHeader title="Təhlükəsizlik" />
      <Card padded={false} style={styles.card}>
        <Row
          first
          icon="shield-checkmark-outline"
          title="Təhlükəsizlik və cihazlar"
          onPress={() => navigation.navigate("Security")}
        />
      </Card>

      <Text style={[t.typography.caption, styles.version, { color: t.color.textSecondary }]}>
        Böyük Loja Messenger · v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  card: { marginHorizontal: 16, overflow: "hidden" },
  version: { textAlign: "center", marginTop: 24 },
});
