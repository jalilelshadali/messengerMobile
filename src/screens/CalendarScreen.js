import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import BottomSheet from "../components/BottomSheet";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import { fetchMeetings, respondToMeeting } from "../api/meetings";
import { useAuth } from "../context/AuthContext";
import { fullDateTime } from "../lib/format";
import { useTheme } from "../theme";

const WEEKDAYS = ["B.e", "Ç.a", "Ç", "C.a", "C", "Ş", "B"];
const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];

function startOfWeek(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function DateChip({ iso }) {
  const t = useTheme();
  const d = new Date(iso);
  return (
    <View style={[styles.dateChip, { backgroundColor: t.color.accentMuted }]}>
      <Text style={[t.typography.title, { fontSize: 18, color: t.color.accent }]}>{d.getDate()}</Text>
      <Text style={[t.typography.label, { color: t.color.accent }]}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
}

function MeetingCard({ meeting, onResponded }) {
  const t = useTheme();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const locked = meeting.can_respond === false;

  async function respond(value, why = "") {
    setBusy(true);
    try {
      const { data } = await respondToMeeting(meeting.id, value, why.trim().slice(0, 300));
      onResponded(data);
      setReasonOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const mine = meeting.my_response;
  const myInvite = meeting.invites?.find((i) => i.user.id === user.id);
  const isOrganiser = user.is_staff || meeting.created_by === user.id;
  const yes = meeting.invites?.filter((i) => i.response === "yes").length ?? 0;
  const pending = meeting.invites?.filter((i) => i.response === "pending").length ?? 0;
  const decliners = meeting.invites?.filter((i) => i.response === "no") ?? [];

  function onPressChoice(v) {
    if (busy) return;
    if (v === "no") {
      setReason(myInvite?.reason || "");
      setReasonOpen(true);
    } else {
      respond("yes");
    }
  }

  return (
    <Card style={[styles.card, locked && { opacity: 0.55 }]}>
      <View style={styles.cardTop}>
        <DateChip iso={meeting.starts_at} />
        <View style={{ flex: 1 }}>
          <Text style={[t.typography.title, { fontSize: 16, color: t.color.textPrimary }]}>{meeting.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={t.color.textSecondary} />
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{fullDateTime(meeting.starts_at)}</Text>
          </View>
          {meeting.location ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={t.color.textSecondary} />
              <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{meeting.location}</Text>
            </View>
          ) : null}
        </View>
        {locked ? <Ionicons name="lock-closed" size={16} color={t.color.textSecondary} /> : null}
      </View>

      {meeting.description ? (
        <Text style={[t.typography.bodySm, { color: t.color.textPrimary, marginTop: 10 }]}>{meeting.description}</Text>
      ) : null}

      {!locked ? (
        <View style={styles.segment}>
          {["yes", "no"].map((v) => {
            const active = mine === v;
            const bg = active ? (v === "yes" ? t.color.success : t.color.danger) : t.color.surfaceAlt;
            const fg = active ? t.color.textOnAccent : t.color.textPrimary;
            return (
              <Pressable
                key={v}
                onPress={() => onPressChoice(v)}
                style={[styles.segBtn, { backgroundColor: bg, borderRadius: t.radius.md }]}
              >
                <Text style={[t.typography.body, { fontSize: 14, color: fg }]}>
                  {v === "yes" ? "İştirak edəcəm" : "Gələ bilmərəm"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {mine === "no" && myInvite?.reason ? (
        <Text style={[t.typography.caption, { color: t.color.textSecondary, marginTop: 8 }]}>
          Səbəbiniz: {myInvite.reason}
        </Text>
      ) : null}

      {isOrganiser && meeting.invites?.length ? (
        <View style={[styles.summary, { borderTopColor: t.color.border }]}>
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
            ✓ {yes} gəlir · ✕ {decliners.length} gəlmir · ⏳ {pending} cavabsız
          </Text>
          {decliners.map((i) => (
            <Text key={i.id} style={[t.typography.caption, { color: t.color.textPrimary, marginTop: 4 }]}>
              {`${i.user.first_name || ""} ${i.user.last_name || ""}`.trim() || i.user.username}
              {i.reason ? ` — ${i.reason}` : ""}
            </Text>
          ))}
        </View>
      ) : null}

      <BottomSheet visible={reasonOpen} onClose={() => setReasonOpen(false)}>
        <Text style={[t.typography.title, { color: t.color.textPrimary, marginBottom: 4 }]}>Gələ bilmirsiniz?</Text>
        <Text style={[t.typography.caption, { color: t.color.textSecondary, marginBottom: 12 }]}>
          {meeting.title} — təşkilatçı səbəbi görəcək.
        </Text>
        <Input
          label="Səbəb (istəyə bağlı)"
          value={reason}
          onChangeText={setReason}
          placeholder="Məsələn: ezamiyyətdəyəm"
        />
        <Button title="Təsdiq et" onPress={() => respond("no", reason)} loading={busy} style={{ marginTop: 14 }} />
      </BottomSheet>
    </Card>
  );
}

export default function CalendarScreen() {
  const t = useTheme();
  const [meetings, setMeetings] = useState([]);

  const load = useCallback(() => {
    fetchMeetings().then(({ data }) => setMeetings(data)).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  function onResponded(updated) {
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  const week = useMemo(() => {
    const s = startOfWeek(new Date());
    return [...Array(7)].map((_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, []);

  const meetingDays = useMemo(
    () => new Set(meetings.map((m) => new Date(m.starts_at).toDateString())),
    [meetings]
  );

  const today = new Date().toDateString();

  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      <View style={[styles.weekStrip, { backgroundColor: t.color.surface, borderBottomColor: t.color.border }]}>
        {week.map((d) => {
          const isToday = d.toDateString() === today;
          const hasMeeting = meetingDays.has(d.toDateString());
          return (
            <View key={d.toISOString()} style={styles.day}>
              <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{WEEKDAYS[(d.getDay() + 6) % 7]}</Text>
              <View style={[styles.dayNum, isToday && { backgroundColor: t.color.accent }]}>
                <Text
                  style={[
                    t.typography.body,
                    { fontSize: 15, color: isToday ? t.color.textOnAccent : t.color.textPrimary },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
              <View style={[styles.dot, { backgroundColor: hasMeeting ? t.color.accentLine : "transparent" }]} />
            </View>
          );
        })}
      </View>

      <FlatList
        data={meetings}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => <MeetingCard meeting={item} onResponded={onResponded} />}
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" title="Planlaşdırılmış iclas yoxdur" hint="Yeni iclas əlavə olunanda burada görünəcək" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  weekStrip: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  day: { alignItems: "center", gap: 4 },
  dayNum: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  card: {},
  cardTop: { flexDirection: "row", gap: 12 },
  dateChip: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  segment: { flexDirection: "row", gap: 8, marginTop: 14 },
  summary: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
});
