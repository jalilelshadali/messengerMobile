export function getDegreeName(degree) {
  if (degree <= 1) return "Şagird";
  if (degree === 2) return "Rəfiq (Çıraq)";
  return "Ustad";
}

export function formatDegree(degree) {
  return `Dərəcə ${degree} - ${getDegreeName(degree)}`;
}
