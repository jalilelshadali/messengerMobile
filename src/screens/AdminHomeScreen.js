import { ScrollView, StyleSheet } from "react-native";

import Card from "../components/Card";
import Row from "../components/Row";
import { useTheme } from "../theme";

export default function AdminHomeScreen({ navigation }) {
  const t = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.color.bg }} contentContainerStyle={styles.content}>
      <Card padded={false}>
        <Row
          first
          icon="people"
          title="Üzvləri idarə et"
          hint="Yeni üzv yarat, dərəcələri dəyiş"
          onPress={() => navigation.navigate("AdminUsers")}
        />
        <Row
          icon="business"
          title="Böyük Loja"
          hint="Möhtərəm Lojalar yarat, üzv təyin et"
          onPress={() => navigation.navigate("AdminOrg")}
        />
        <Row
          icon="library"
          title="Kitabxana idarəetməsi"
          hint="PDF sənəd əlavə et, dərəcə təyin et"
          onPress={() => navigation.navigate("AdminBooks")}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
