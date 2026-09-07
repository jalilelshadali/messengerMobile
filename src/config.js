// Deployed VPS backend — used for shareable/APK builds so the app works on
// any network. Plain HTTP for now (usesCleartextTraffic is enabled in
// app.json) — swap to https:// once a domain + certbot are set up.
export const API_BASE_URL = "http://169.58.161.115/api";

// For local testing against Django on this PC, temporarily swap in the LAN IP,
// e.g. "http://192.168.1.173:8000/api" (phone must be on the same Wi-Fi).
