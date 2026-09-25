import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomSheet from "../components/BottomSheet";
import DateSeparator from "../components/DateSeparator";
import ForwardSheet from "../components/ForwardSheet";
import MessageBubble from "../components/MessageBubble";
import PeerProfileSheet from "../components/PeerProfileSheet";
import {
  deleteMessage,
  editMessage,
  fetchConversation,
  fetchMessages,
  markConversationRead,
  sendEncryptedMessage,
  sendGroupMessage,
} from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { decryptFromSender, encryptForRecipient, getOrCreateIdentityKeyPair } from "../crypto";
import {
  MAX_ATTACHMENT_BYTES,
  describeBody,
  encodeAttachmentBody,
  formatDuration,
  getAttachmentUri,
  parseAttachmentBody,
  sendAttachment,
} from "../lib/attachments";
import { dateSeparatorLabel, dayKey, messageTime } from "../lib/format";
import { rememberMessages } from "../lib/messageStore";
import { useTheme } from "../theme";

const GROUP_GAP_MS = 3 * 60 * 1000;

function decryptDirect(message, otherPublicKey, mySecretKey) {
  if (!message.ciphertext) return message.text || "";
  if (!otherPublicKey) return null;
  return decryptFromSender(message.ciphertext, message.nonce, otherPublicKey, mySecretKey);
}

// Mesajları tarix ayırıcıları + qruplaşma məlumatı ilə düz siyahıya çevirir.
function buildItems(messages, meId) {
  const out = [];
  let lastDay = null;
  messages.forEach((m, i) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      out.push({ type: "date", id: `d-${k}`, label: dateSeparatorLabel(m.created_at) });
      lastDay = k;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameAsPrev =
      prev &&
      prev.sender.id === m.sender.id &&
      dayKey(prev.created_at) === k &&
      new Date(m.created_at) - new Date(prev.created_at) < GROUP_GAP_MS;
    const sameAsNext =
      next &&
      next.sender.id === m.sender.id &&
      dayKey(next.created_at) === k &&
      new Date(next.created_at) - new Date(m.created_at) < GROUP_GAP_MS;
    let grouped = "single";
    if (sameAsPrev && sameAsNext) grouped = "middle";
    else if (sameAsPrev) grouped = "last";
    else if (sameAsNext) grouped = "first";
    out.push({ type: "msg", id: `m-${m.id}`, message: m, grouped, showSender: !sameAsPrev });
  });
  return out;
}

export default function ChatScreen({ route, navigation }) {
  const { conversationId, title, isGroup } = route.params;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherPublicKey, setOtherPublicKey] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [mySecretKey, setMySecretKey] = useState(null);
  const [presence, setPresence] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [peerOpen, setPeerOpen] = useState(false);
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [iAmAdmin, setIAmAdmin] = useState(false);
  const [peerLastRead, setPeerLastRead] = useState(null);
  const [peerLastDelivered, setPeerLastDelivered] = useState(null);
  const [editing, setEditing] = useState(null); // redaktə olunan mesaj
  const [actionMsg, setActionMsg] = useState(null); // uzun basılan mesaj
  const [forwardMsg, setForwardMsg] = useState(null); // yönləndirilən mesaj
  const [notice, setNotice] = useState(null);
  const listRef = useRef(null);

  // Səs yazma / oxutma (bir oxuducu — eyni anda bir səs mesajı).
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const pStatus = useAudioPlayerStatus(player);
  const [recording, setRecording] = useState(false);
  const [voiceId, setVoiceId] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(null);
  const [fileBusyId, setFileBusyId] = useState(null);

  function applyConversation(data) {
    if (isGroup) {
      setPresence(`${data.participants.length} üzv`);
      setAdminsOnly(!!data.admins_only);
      setIAmAdmin(!!data.is_admin);
      setPeerLastRead(data.peer_last_read || null);
      setPeerLastDelivered(data.peer_last_delivered || null);
    } else {
      const other = data.participants.find((p) => p.id !== user.id);
      setOtherUser(other || null);
      setOtherPublicKey(other?.public_key || "");
      setPresence("uçdan-uca şifrəli");
      setPeerLastRead(data.peer_last_read || null);
      setPeerLastDelivered(data.peer_last_delivered || null);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const { secretKey } = await getOrCreateIdentityKeyPair();
      if (!active) return;
      setMySecretKey(secretKey);
      const { data } = await fetchConversation(conversationId);
      if (!active) return;
      applyConversation(data);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isGroup, user.id]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const { data } = await fetchMessages(conversationId);
        if (!active) return;
        // Serverdən gələn siyahı hər şeyi əvəz edir, amma hələ çatmamış
        // (optimistik) mesajları saxla.
        setMessages((prev) => {
          const localOnly = prev.filter((m) => m._pending || m._failed);
          return [...data, ...localOnly];
        });
        markConversationRead(conversationId).catch(() => {});
        // Söhbət metasını (çatdı/oxundu quşları, admin rejimi) yenilə.
        fetchConversation(conversationId)
          .then(({ data: c }) => active && applyConversation(c))
          .catch(() => {});
      } catch {
        /* offline */
      }
    }
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [conversationId]);

  const items = useMemo(() => {
    // Optimistik göndərmə + polling üst-üstə düşəndə eyni mesaj iki dəfə
    // ola bilər — id-yə görə təkrarları at.
    const seen = new Set();
    const deduped = messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return buildItems(deduped, user.id);
  }, [messages, user.id]);

  // Söhbət lentini axtarış üçün lokal indeksə yaz (deşifrə edilmiş mətnlə).
  useEffect(() => {
    if (!messages.length) return;
    if (!isGroup && !mySecretKey) return;
    const decoded = messages
      .map((m) => {
        const body = isGroup ? m.text : decryptDirect(m, otherPublicKey, mySecretKey);
        if (!body) return null;
        return {
          id: m.id,
          text: describeBody(body),
          from: m.sender.first_name || m.sender.username,
          at: m.created_at,
          mine: m.sender.id === user.id,
        };
      })
      .filter(Boolean);
    rememberMessages(conversationId, { name: title, isGroup }, decoded);
  }, [messages, isGroup, otherPublicKey, mySecretKey, conversationId, title, user.id]);

  async function handleSend() {
    const value = text.trim();
    if (!value || blocked) return;
    setText("");

    // Optimistik: mesaj dərhal lentdə görünür ("gedir" statusu ilə),
    // server cavabı gələndə əsl mesajla əvəz olunur.
    const tmpId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tmpId,
      sender: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
      },
      text: value,
      ciphertext: "",
      nonce: "",
      created_at: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let data;
      if (isGroup) {
        ({ data } = await sendGroupMessage(conversationId, value));
      } else {
        const { ciphertext, nonce } = encryptForRecipient(value, otherPublicKey, mySecretKey);
        ({ data } = await sendEncryptedMessage(conversationId, ciphertext, nonce));
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.id !== tmpId);
        return prev.map((m) => (m.id === tmpId ? data : m));
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === tmpId ? { ...m, _pending: false, _failed: true } : m))
      );
    }
  }

  function retrySend(failed) {
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
    setText(failed.text);
  }

  function startEdit(m) {
    setActionMsg(null);
    setEditing(m);
    setText(m._body || m.text || "");
  }

  function cancelEdit() {
    setEditing(null);
    setText("");
  }

  async function handleSaveEdit() {
    const value = text.trim();
    const m = editing;
    if (!m || !value) return;
    setEditing(null);
    setText("");
    try {
      let data;
      if (isGroup || !m.ciphertext) {
        ({ data } = await editMessage(conversationId, m.id, { text: value }));
      } else {
        const { ciphertext, nonce } = encryptForRecipient(value, otherPublicKey, mySecretKey);
        ({ data } = await editMessage(conversationId, m.id, { ciphertext, nonce }));
      }
      setMessages((prev) => prev.map((x) => (x.id === m.id ? data : x)));
    } catch {
      /* redaktə alınmadı — növbəti poll köhnə mesajı qaytaracaq */
    }
  }

  async function handleDelete(m) {
    setActionMsg(null);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    try {
      await deleteMessage(conversationId, m.id);
    } catch {
      /* silmə alınmadı — poll qaytaracaq */
    }
  }

  async function handleCopy(value, id) {
    await Clipboard.setStringAsync(value);
    Haptics.selectionAsync().catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((p) => (p === id ? null : p)), 1400);
  }

  function flash(message) {
    setNotice(message);
    setTimeout(() => setNotice(null), 2600);
  }

  // Qoşma göndər: optimistik (yüklənir…), alınmasa mesaj silinir + xəbərdarlıq.
  async function postAttachment(kind, asset) {
    const tmpId = `tmp-${Date.now()}`;
    const meta = {
      kind,
      name: asset.name,
      mime: asset.mime,
      size: asset.size,
      ...(asset.dur ? { dur: asset.dur } : {}),
    };
    setMessages((prev) => [
      ...prev,
      {
        id: tmpId,
        sender: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        },
        text: encodeAttachmentBody(meta),
        ciphertext: "",
        nonce: "",
        created_at: new Date().toISOString(),
        _pending: true,
      },
    ]);
    try {
      const { data } = await sendAttachment({
        conversationId,
        isGroup,
        kind,
        asset,
        otherPublicKey,
        mySecretKey,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev.filter((m) => m.id !== tmpId);
        return prev.map((m) => (m.id === tmpId ? data : m));
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tmpId));
      flash("Qoşma göndərilə bilmədi");
    }
  }

  async function pickFile() {
    if (blocked) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if (a.size && a.size > MAX_ATTACHMENT_BYTES) {
        flash("Fayl 15 MB-dan böyük ola bilməz");
        return;
      }
      postAttachment("file", { uri: a.uri, name: a.name, mime: a.mimeType, size: a.size });
    } catch {
      flash("Fayl seçilə bilmədi");
    }
  }

  async function startRecording() {
    if (blocked) return;
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Mikrofon icazəsi lazımdır", "Səs yazmaq üçün telefon parametrlərindən mikrofona icazə verin.");
        return;
      }
      player.pause();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      flash("Səs yazılmağa başlaya bilmədi");
    }
  }

  async function stopRecorder() {
    setRecording(false);
    try {
      await recorder.stop();
    } catch {
      /* artıq dayanıb */
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }

  async function cancelRecording() {
    await stopRecorder();
  }

  async function finishRecording() {
    const secs = (recState.durationMillis || 0) / 1000;
    await stopRecorder();
    const uri = recorder.uri;
    if (!uri || secs < 1) return; // çox qısa — təsadüfi toxunuş
    postAttachment("voice", {
      uri,
      name: `voice-${Date.now()}.m4a`,
      mime: "audio/mp4",
      size: 0,
      dur: Math.round(secs),
    });
  }

  async function toggleVoice(m, meta) {
    if (String(m.id).startsWith("tmp-")) return;
    if (voiceId === m.id) {
      if (pStatus.playing) {
        player.pause();
      } else {
        if (pStatus.duration && pStatus.currentTime >= pStatus.duration - 0.1) await player.seekTo(0);
        player.play();
      }
      return;
    }
    setVoiceLoading(m.id);
    try {
      const uri = await getAttachmentUri(conversationId, m.id, meta);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      player.replace(uri);
      setVoiceId(m.id);
      player.play();
    } catch {
      flash("Səs mesajı açıla bilmədi");
    } finally {
      setVoiceLoading(null);
    }
  }

  async function openFile(m, meta) {
    if (String(m.id).startsWith("tmp-")) return;
    setFileBusyId(m.id);
    try {
      const uri = await getAttachmentUri(conversationId, m.id, meta);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: meta.mime, dialogTitle: meta.name });
      } else {
        flash("Bu cihazda faylı açmaq mümkün deyil");
      }
    } catch {
      flash("Fayl açıla bilmədi");
    } finally {
      setFileBusyId(null);
    }
  }

  const keyMissing = !isGroup && !otherPublicKey && mySecretKey;
  const adminOnlyLock = isGroup && adminsOnly && !iAmAdmin;
  const blocked = keyMissing || adminOnlyLock;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.color.bg }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: t.color.surface, borderBottomColor: t.color.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={t.color.accent} />
        </Pressable>
        <View
          style={[
            styles.hAvatar,
            { backgroundColor: isGroup ? t.color.accentMuted : t.color.surfaceAlt },
          ]}
        >
          {isGroup ? (
            <Ionicons name="people" size={20} color={t.color.accent} />
          ) : (
            <Text style={{ fontFamily: "Archivo-SemiBold", color: t.color.textPrimary }}>
              {(title || "?").trim()[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <Pressable
          style={styles.hText}
          onPress={() =>
            isGroup
              ? navigation.navigate("GroupInfo", { conversationId })
              : otherUser && setPeerOpen(true)
          }
        >
          <Text numberOfLines={1} style={[t.typography.title, { fontSize: 16, color: t.color.textPrimary }]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[t.typography.caption, { color: t.color.textSecondary }]}>
            {presence}
          </Text>
        </Pressable>
        {isGroup ? (
          <Pressable onPress={() => navigation.navigate("GroupInfo", { conversationId })} hitSlop={10}>
            <Ionicons name="information-circle-outline" size={24} color={t.color.accent} />
          </Pressable>
        ) : null}
      </View>

      {keyMissing ? (
        <View style={[styles.banner, { backgroundColor: t.color.accentMuted }]}>
          <Ionicons name="lock-open-outline" size={14} color={t.color.danger} />
          <Text style={[t.typography.caption, { color: t.color.danger, flex: 1 }]}>
            Qarşı tərəf hələ təhlükəsiz açar yaratmayıb — mesajlaşma bloklanıb.
          </Text>
        </View>
      ) : adminOnlyLock ? (
        <View style={[styles.banner, { backgroundColor: t.color.accentMuted }]}>
          <Ionicons name="lock-closed" size={14} color={t.color.textSecondary} />
          <Text style={[t.typography.caption, { color: t.color.textSecondary, flex: 1 }]}>
            Bu qrupda yalnız adminlər mesaj yaza bilər.
          </Text>
        </View>
      ) : (
        <View style={styles.e2eePill}>
          <View style={[styles.pill, { backgroundColor: t.color.accentMuted }]}>
            <Ionicons name="lock-closed" size={12} color={t.color.accent} />
            <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>
              {isGroup ? "Qrup mesajları hələ E2EE deyil" : "Mesajlar uçdan-uca şifrələnir"}
            </Text>
          </View>
        </View>
      )}

      {notice ? (
        <View style={styles.e2eePill}>
          <View style={[styles.pill, { backgroundColor: t.color.accent }]}>
            <Text style={[t.typography.caption, { color: t.color.textOnAccent }]}>{notice}</Text>
          </View>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(it) => it.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
        renderItem={({ item }) => {
          if (item.type === "date") return <DateSeparator label={item.label} />;
          const m = item.message;
          const mine = m.sender.id === user.id;
          const body = isGroup || !m.ciphertext ? m.text : decryptDirect(m, otherPublicKey, mySecretKey);
          const undecryptable = !isGroup && m.ciphertext && body === null;
          const attMeta = undecryptable ? null : parseAttachmentBody(body);
          const isThisVoice = attMeta?.kind === "voice" && voiceId === m.id;
          const voice =
            attMeta?.kind === "voice"
              ? {
                  playing: isThisVoice && pStatus.playing,
                  loading: voiceLoading === m.id,
                  progress: isThisVoice && pStatus.duration ? Math.min(1, pStatus.currentTime / pStatus.duration) : 0,
                  position: isThisVoice ? pStatus.currentTime : attMeta.dur,
                  onToggle: () => toggleVoice(m, attMeta),
                }
              : null;
          // 1 boz quş = serverə çatdı, 2 boz = qarşı tərəfin cihazına çatdı,
          // 2 mavi = oxundu. Qrupda hamı çatdıqda/oxuduqda dəyişir.
          const settled = mine && !m._pending && !m._failed;
          const at = new Date(m.created_at);
          const readByPeer = settled && peerLastRead && at <= new Date(peerLastRead);
          const deliveredToPeer =
            settled && peerLastDelivered && at <= new Date(peerLastDelivered);
          const status = !mine
            ? undefined
            : m._failed
              ? "failed"
              : m._pending
                ? "sending"
                : readByPeer
                  ? "read"
                  : deliveredToPeer
                    ? "delivered"
                    : "sent";
          return (
            <MessageBubble
              text={copiedId === m.id ? "Kopyalandı ✓" : body}
              mine={mine}
              senderName={m.sender.first_name || m.sender.username}
              showSender={isGroup && item.showSender}
              grouped={item.grouped}
              time={
                m._failed
                  ? "Göndərilmədi"
                  : `${messageTime(m.created_at)}${m.edited_at ? " · redaktə edilib" : ""}`
              }
              status={status}
              undecryptable={undecryptable}
              attachment={attMeta}
              voice={voice}
              fileBusy={fileBusyId === m.id}
              onOpenFile={() => openFile(m, attMeta)}
              onLongPress={() =>
                !undecryptable && !m._pending && !m._failed && setActionMsg({ ...m, _body: body })
              }
              onPress={m._failed ? () => retrySend(m) : undefined}
            />
          );
        }}
      />

      <View style={{ backgroundColor: t.color.surface }}>
        {editing ? (
          <View style={[styles.editBar, { borderTopColor: t.color.border }]}>
            <Ionicons name="pencil" size={14} color={t.color.accent} />
            <Text style={[t.typography.caption, { color: t.color.textSecondary, flex: 1 }]} numberOfLines={1}>
              Mesajı redaktə edirsiniz
            </Text>
            <Pressable onPress={cancelEdit} hitSlop={8}>
              <Ionicons name="close" size={18} color={t.color.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {recording ? (
          <View style={[styles.inputRow, { borderTopColor: t.color.border, paddingBottom: insets.bottom || 8, alignItems: "center" }]}>
            <Pressable onPress={cancelRecording} hitSlop={8} style={styles.plus}>
              <Ionicons name="trash-outline" size={24} color={t.color.danger} />
            </Pressable>
            <View style={[styles.recPill, { backgroundColor: t.color.surfaceAlt, borderRadius: t.radius.lg }]}>
              <View style={[styles.recDot, { backgroundColor: t.color.danger }]} />
              <Text style={[t.typography.body, { color: t.color.textPrimary }]}>
                {formatDuration((recState.durationMillis || 0) / 1000)}
              </Text>
              <Text style={[t.typography.caption, { color: t.color.textSecondary }]}>Yazılır…</Text>
            </View>
            <Pressable onPress={finishRecording} style={[styles.send, { backgroundColor: t.color.accent }]} hitSlop={6}>
              <Ionicons name="send" size={18} color={t.color.textOnAccent} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.inputRow, { borderTopColor: t.color.border, paddingBottom: insets.bottom || 8 }]}>
            {!editing ? (
              <Pressable onPress={pickFile} hitSlop={8} style={styles.plus}>
                <Ionicons name="attach" size={24} color={t.color.textSecondary} />
              </Pressable>
            ) : null}
            <TextInput
              style={[
                t.typography.body,
                styles.input,
                { backgroundColor: t.color.surfaceAlt, color: t.color.textPrimary, borderRadius: t.radius.lg },
              ]}
              placeholder={blocked ? "Mesaj göndərmək olmur" : "Mesaj yazın"}
              placeholderTextColor={t.color.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
              editable={!blocked}
            />
            <Pressable
              onPress={editing ? handleSaveEdit : text.trim() ? handleSend : startRecording}
              style={[styles.send, { backgroundColor: t.color.accent }]}
              hitSlop={6}
            >
              <Ionicons
                name={editing ? "checkmark" : text.trim() ? "send" : "mic"}
                size={18}
                color={t.color.textOnAccent}
              />
            </Pressable>
          </View>
        )}
      </View>

      <PeerProfileSheet
        visible={peerOpen}
        onClose={() => setPeerOpen(false)}
        user={otherUser}
        conversationId={conversationId}
      />

      <ForwardSheet
        visible={!!forwardMsg}
        text={forwardMsg?._body || ""}
        onClose={() => setForwardMsg(null)}
        onDone={({ sent, failed }) => {
          setForwardMsg(null);
          setNotice(failed ? `${sent} göndərildi, ${failed} alınmadı` : "Mesaj yönləndirildi ✓");
          setTimeout(() => setNotice(null), 2200);
        }}
      />

      <BottomSheet visible={!!actionMsg} onClose={() => setActionMsg(null)}>
        {actionMsg ? (
          <View style={[styles.actionCard, { borderColor: t.color.border }]}>
            {!parseAttachmentBody(actionMsg._body) ? (
              <>
                <Pressable
                  onPress={() => {
                    handleCopy(actionMsg._body, actionMsg.id);
                    setActionMsg(null);
                  }}
                  style={({ pressed }) => [styles.action, pressed && { backgroundColor: t.color.surfaceAlt }]}
                >
                  <Ionicons name="copy-outline" size={19} color={t.color.textPrimary} />
                  <Text style={[t.typography.body, { fontSize: 15, color: t.color.textPrimary }]}>Kopyala</Text>
                </Pressable>

                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.color.border }} />
                <Pressable
                  onPress={() => {
                    setForwardMsg(actionMsg);
                    setActionMsg(null);
                  }}
                  style={({ pressed }) => [styles.action, pressed && { backgroundColor: t.color.surfaceAlt }]}
                >
                  <Ionicons name="arrow-redo-outline" size={19} color={t.color.textPrimary} />
                  <Text style={[t.typography.body, { fontSize: 15, color: t.color.textPrimary }]}>Yönləndir</Text>
                </Pressable>
              </>
            ) : null}

            {actionMsg.sender.id === user.id && !parseAttachmentBody(actionMsg._body) ? (
              <>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.color.border }} />
                <Pressable
                  onPress={() => startEdit(actionMsg)}
                  style={({ pressed }) => [styles.action, pressed && { backgroundColor: t.color.surfaceAlt }]}
                >
                  <Ionicons name="pencil-outline" size={19} color={t.color.textPrimary} />
                  <Text style={[t.typography.body, { fontSize: 15, color: t.color.textPrimary }]}>Redaktə et</Text>
                </Pressable>
              </>
            ) : null}

            {actionMsg.sender.id === user.id || (isGroup && iAmAdmin) ? (
              <>
                {!parseAttachmentBody(actionMsg._body) ? (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.color.border }} />
                ) : null}
                <Pressable
                  onPress={() => handleDelete(actionMsg)}
                  style={({ pressed }) => [styles.action, pressed && { backgroundColor: t.color.surfaceAlt }]}
                >
                  <Ionicons name="trash-outline" size={19} color={t.color.danger} />
                  <Text style={[t.typography.body, { fontSize: 15, color: t.color.danger }]}>Sil</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 2 },
  hAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hText: { flex: 1 },
  banner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  e2eePill: { alignItems: "center", paddingVertical: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  plus: { height: 40, justifyContent: "center" },
  input: { flex: 1, maxHeight: 120, paddingHorizontal: 14, paddingVertical: 9 },
  recPill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 40 },
  recDot: { width: 10, height: 10, borderRadius: 5 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  editBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  action: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
});
