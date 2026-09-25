import {
  sendEncryptedMessage,
  sendGroupMessage,
  startDirectConversation,
} from "../api/chat";
import { encryptForRecipient, getOrCreateIdentityKeyPair } from "../crypto";

// Mesajı seçilmiş hədəflərə göndərir. target: { conversation } (mövcud söhbət)
// və ya { user } (hələ söhbət yoxdur). Hər hədəf üçün { ok } qaytarır.
export async function forwardText(text, targets, meId) {
  const { secretKey } = await getOrCreateIdentityKeyPair();
  const results = [];

  for (const target of targets) {
    try {
      let conversation = target.conversation;
      if (!conversation) {
        ({ data: conversation } = await startDirectConversation(target.user.id));
      }

      if (conversation.is_group) {
        await sendGroupMessage(conversation.id, text);
      } else {
        const other = conversation.participants.find((p) => p.id !== meId);
        if (!other?.public_key) throw new Error("no-key");
        const { ciphertext, nonce } = encryptForRecipient(text, other.public_key, secretKey);
        await sendEncryptedMessage(conversation.id, ciphertext, nonce);
      }
      results.push({ ok: true });
    } catch {
      results.push({ ok: false });
    }
  }
  return results;
}
