const MONTHS_AZ = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 14:32 / Dünən / 12 sen
export function chatListTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) {
    return d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Dünən";
  return `${d.getDate()} ${MONTHS_AZ[d.getMonth()]}`;
}

export function messageTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
}

// Söhbət içi tarix ayırıcısı: Bu gün / Dünən / 12 sen 2026
export function dateSeparatorLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return "Bu gün";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Dünən";
  return `${d.getDate()} ${MONTHS_AZ[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function fullDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
