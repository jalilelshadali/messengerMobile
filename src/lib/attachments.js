// Səs mesajı və fayl qoşmaları.
//
// 1:1 söhbət (E2EE): fayl cihazda təsadüfi açarla (nacl.secretbox) şifrələnir,
// serverə yalnız şifrəli blob yüklənir. Açar + ad + növ mesajın öz
// (şifrəli) mətninin içində gedir — server nə fayl adını, nə məzmunu görür.
// Qrup (hələ E2EE deyil): fayl olduğu kimi yüklənir, meta düz mətn kimi gedir.
import { File, Paths } from "expo-file-system";
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64 } from "tweetnacl-util";

import client from "../api/client";
import { encryptForRecipient } from "../crypto";

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

// Mesaj mətninin qoşma olduğunu göstərən görünməz prefiks.
const MARK = "\u0001ATT:";

export function encodeAttachmentBody(meta) {
  return MARK + JSON.stringify(meta);
}

// { kind: "voice"|"file", name, mime, size, dur?, key?, nonce? } və ya null
export function parseAttachmentBody(body) {
  if (typeof body !== "string" || !body.startsWith(MARK)) return null;
  try {
    const meta = JSON.parse(body.slice(MARK.length));
    return meta && (meta.kind === "voice" || meta.kind === "file") ? meta : null;
  } catch {
    return null;
  }
}

// Söhbət siyahısı / axtarış üçün qısa mətn.
export function describeBody(body) {
  const meta = parseAttachmentBody(body);
  if (!meta) return body;
  return meta.kind === "voice" ? "🎤 Səs mesajı" : `📎 ${meta.name || "Fayl"}`;
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function encryptBlob(bytes) {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  return {
    blob: nacl.secretbox(bytes, nonce, key),
    key: encodeBase64(key),
    nonce: encodeBase64(nonce),
  };
}

function decryptBlob(bytes, keyB64, nonceB64) {
  return nacl.secretbox.open(bytes, decodeBase64(nonceB64), decodeBase64(keyB64));
}

function extensionOf(meta) {
  if (meta.kind === "voice") return "m4a";
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(meta.name || "");
  return m ? m[1].toLowerCase() : "bin";
}

// Qoşmanı göndərir. asset: { uri, name, mime, size, dur? }.
// DM üçün otherPublicKey + mySecretKey lazımdır.
export async function sendAttachment({
  conversationId,
  isGroup,
  kind,
  asset,
  otherPublicKey,
  mySecretKey,
}) {
  const meta = {
    kind,
    name: asset.name || (kind === "voice" ? "voice.m4a" : "file"),
    mime: asset.mime || "application/octet-stream",
    size: asset.size || 0,
    ...(asset.dur ? { dur: asset.dur } : {}),
  };

  const form = new FormData();
  let tmp = null;

  if (isGroup) {
    form.append("text", encodeAttachmentBody(meta));
    form.append("attachment", { uri: asset.uri, name: meta.name, type: meta.mime });
  } else {
    const bytes = await new File(asset.uri).bytes();
    const { blob, key, nonce } = encryptBlob(bytes);
    tmp = new File(Paths.cache, `up-${Date.now()}.bin`);
    tmp.create();
    tmp.write(blob);

    const sealed = encryptForRecipient(
      encodeAttachmentBody({ ...meta, key, nonce }),
      otherPublicKey,
      mySecretKey
    );
    form.append("ciphertext", sealed.ciphertext);
    form.append("nonce", sealed.nonce);
    form.append("attachment", { uri: tmp.uri, name: "blob.bin", type: "application/octet-stream" });
  }

  try {
    return await client.post(`/chat/conversations/${conversationId}/messages/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } finally {
    try {
      tmp?.delete();
    } catch {
      /* cache — vacib deyil */
    }
  }
}

// Qoşmanı yükləyir (lazım olsa deşifrə edir), keşdə saxlayır, file:// uri qaytarır.
export async function getAttachmentUri(conversationId, messageId, meta) {
  // Paylaşanda alıcı tətbiq orijinal adı görsün deyə adı saxlayırıq.
  const safe = (meta.name || "").replace(/[^\w.\- ]+/g, "_").slice(-60);
  const file = new File(
    Paths.cache,
    meta.kind === "voice" ? `att-${messageId}.m4a` : `att-${messageId}-${safe || `file.${extensionOf(meta)}`}`
  );
  if (file.exists && file.size > 0) return file.uri;

  const res = await client.get(
    `/chat/conversations/${conversationId}/messages/${messageId}/attachment/`,
    { responseType: "arraybuffer" }
  );
  let bytes = new Uint8Array(res.data);
  if (meta.key) {
    bytes = decryptBlob(bytes, meta.key, meta.nonce);
    if (!bytes) throw new Error("decrypt-failed");
  }
  if (!file.exists) file.create();
  file.write(bytes);
  return file.uri;
}
