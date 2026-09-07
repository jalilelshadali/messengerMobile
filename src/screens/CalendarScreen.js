import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchMeetings, respondToMeeting } from "../api/meetings";

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MeetingCard({ meeting, onResponded }) {
  const [isResponding, setIsResponding] = useState(false);

  async function respond(value) {
    setIsResponding(true);
    try {
      const { data } = await respondToMeeting(meeting.id, value);
      onResponded(data);
    } finally {
      setIsResponding(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{meeting.title}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={14} color="#8b949e" />
        <Text style={styles.meta}>{formatDateTime(meeting.starts_at)}</Text>
      </View>
      {meeting.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#8b949e" />
          <Text style={styles.meta}>{meeting.location}</Text>
        </View>
      ) : null}
      {meeting.description ? <Text style={styles.description}>{meeting.description}</Text> : null}

      {isResponding ? (
        <ActivityIndicator color="#d4af37" style={{ marginTop: 10 }} />
      ) : (
        <View style={styles.responseRow}>
          <Pressable
            style={[styles.responseButton, meeting.my_response === "yes" && styles.responseButtonActiveYes]}
            onPress={() => respond("yes")}
          >
            <Text style={styles.responseButtonText}>İştirak edəcəm</Text>
          </Pressable>
          <Pressable
            style={[styles.responseButton, meeting.my_response === "no" && styles.responseButtonActiveNo]}
            onPress={() => respond("no")}
          >
            <Text style={styles.responseButtonText}>Gəlməyəcəm</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function CalendarScreen() {
  const [meetings, setMeetings] = useState([]);

  const load = useCallback(() => {
    fetchMeetings().then(({ data }) => setMeetings(data));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function handleResponded(updated) {
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={meetings}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MeetingCard meeting={item} onResponded={handleResponded} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>Planlaşdırılmış iclas yoxdur</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1117" },
  card: {
    backgroundColor: "#161b22",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 14,
    marginBottom: 12,
  },
  title: { color: "#d4af37", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  meta: { color: "#8b949e", fontSize: 12 },
  description: { color: "#fff", fontSize: 13, marginTop: 8 },
  responseRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  responseButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    paddingVertical: 10,
    alignItems: "center",
  },
  responseButtonActiveYes: { backgroundColor: "#238636", borderColor: "#238636" },
  responseButtonActiveNo: { backgroundColor: "#8b1a1a", borderColor: "#8b1a1a" },
  responseButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: { color: "#8b949e", textAlign: "center", marginTop: 40 },
});
