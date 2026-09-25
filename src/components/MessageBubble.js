import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDuration, formatSize } from "../lib/attachments";
import { useTheme } from "../theme";

const BARS = [6, 10, 14, 8, 16, 12, 6, 14, 18, 10, 8, 16, 12, 6, 10, 14, 8, 12, 16, 10, 6, 12, 8, 10];

// Səs mesajı: play/pause + "dalğa" cərgəsi + müddət.
function VoiceContent({ meta, voice, onLongPress }) {
  const t = useTheme();
  const progress = voice?.progress || 0;
  const shown = voice?.playing || progress > 0 ? voice.position : meta.dur;
  return (
    <View style={styles.voice}>
      <Pressable
        onPress={voice?.onToggle}
        onLongPress={onLongPress}
        hitSlop={6}
        style={[styles.playBtn, { backgroundColor: t.color.accent }]}
      >
        {voice?.loading ? (
          <ActivityIndicator size="small" color={t.color.textOnAccent} />
        ) : (
          <Ionicons name={voice?.playing ? "pause" : "play"} size={18} color={t.color.textOnAccent} />
        )}
      </Pressable>
      <View style={styles.wave}>
        {BARS.map((h, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 2,
              backgroundColor: i / BARS.length < progress ? t.color.accent : t.color.border,
            }}
          />
        ))}
      </View>
      <Text style={[styles.time, { color: t.color.textSecondary, minWidth: 30 }]}>{formatDuration(shown)}</Text>
    </View>
  );
}

function fileIcon(meta) {
  const n = `${meta.name || ""} ${meta.mime || ""}`.toLowerCase();
  if (n.includes("pdf")) return "document-text";
  if (/(doc|word)/.test(n)) return "document";
  if (/(xls|sheet|csv)/.test(n)) return "grid";
  if (/(image|png|jpe?g|gif)/.test(n)) return "image";
  if (/(zip|rar|7z)/.test(n)) return "archive";
  return "document-attach";
}

// Fayl kartı: ikon + ad + ölçü; toxunanda açılır/paylaşılır.
function FileContent({ meta, busy, onOpen, onLongPress }) {
  const t = useTheme();
  return (
    <Pressable onPress={onOpen} onLongPress={onLongPress} style={styles.file}>
      <View style={[styles.fileIcon, { backgroundColor: t.color.accentMuted }]}>
        {busy ? (
          <ActivityIndicator size="small" color={t.color.accent} />
        ) : (
          <Ionicons name={fileIcon(meta)} size={22} color={t.color.accent} />
        )}
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text numberOfLines={2} style={[t.typography.bodySm, { color: t.color.textPrimary }]}>
          {meta.name}
        </Text>
        {meta.size ? (
          <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>{formatSize(meta.size)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function StatusIcon({ status, color }) {
  const map = {
    sending: "time-outline",
    sent: "checkmark",
    delivered: "checkmark-done",
    read: "checkmark-done",
    failed: "alert-circle",
  };
  const name = map[status];
  if (!name) return null;
  return <Ionicons name={name} size={15} color={color} style={{ marginLeft: 3 }} />;
}

// grouped: "single" | "first" | "middle" | "last" — künc radiuslarını dəyişir.
export default function MessageBubble({
  text,
  mine,
  senderName,
  time,
  status,
  showSender = false,
  grouped = "single",
  undecryptable = false,
  attachment = null, // { kind, name, size, dur, ... } — mətn əvəzinə göstərilir
  voice = null, // { playing, loading, progress, position, onToggle }
  fileBusy = false,
  onOpenFile,
  onLongPress,
  onPress,
}) {
  const t = useTheme();

  const big = t.radius.lg;
  const small = 6;
  const corners = mine
    ? {
        borderTopLeftRadius: big,
        borderBottomLeftRadius: big,
        borderTopRightRadius: grouped === "first" || grouped === "single" ? big : small,
        borderBottomRightRadius: grouped === "last" || grouped === "single" ? big : small,
      }
    : {
        borderTopRightRadius: big,
        borderBottomRightRadius: big,
        borderTopLeftRadius: grouped === "first" || grouped === "single" ? big : small,
        borderBottomLeftRadius: grouped === "last" || grouped === "single" ? big : small,
      };

  const statusColor = status === "failed" ? t.color.danger : status === "read" ? t.color.tickRead : t.color.textSecondary;

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.bubble,
        corners,
        {
          alignSelf: mine ? "flex-end" : "flex-start",
          backgroundColor: mine ? t.color.bubbleMine : t.color.bubbleOther,
          borderWidth: mine ? 0 : 1,
          borderColor: t.color.border,
          marginTop: grouped === "middle" || grouped === "last" ? 2 : 8,
        },
      ]}
    >
      {showSender && !mine && senderName ? (
        <Text style={[styles.sender, { color: t.color.accent }]}>{senderName}</Text>
      ) : null}

      {attachment && !undecryptable ? (
        attachment.kind === "voice" ? (
          <VoiceContent meta={attachment} voice={voice} onLongPress={onLongPress} />
        ) : (
          <FileContent meta={attachment} busy={fileBusy} onOpen={onOpenFile} onLongPress={onLongPress} />
        )
      ) : (
        <Text
          style={[
            t.typography.body,
            { color: undecryptable ? t.color.textSecondary : t.color.textPrimary, fontStyle: undecryptable ? "italic" : "normal" },
          ]}
        >
          {undecryptable ? "🔒 Mesaj deşifrə edilə bilmədi" : text}
        </Text>
      )}

      <View style={styles.meta}>
        <Text style={[styles.time, { color: t.color.textSecondary }]}>{time}</Text>
        {mine ? <StatusIcon status={status} color={statusColor} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8 },
  sender: { fontFamily: "Archivo-SemiBold", fontSize: 12, marginBottom: 2 },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 3 },
  time: { fontFamily: "Archivo-Regular", fontSize: 10 },
  voice: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 190 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 24 },
  file: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 },
  fileIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
