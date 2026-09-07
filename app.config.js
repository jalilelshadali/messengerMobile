// app.json stays the static base (still readable by tools that expect plain
// JSON). This wrapper only exists to swap in the Firebase config file at
// build time: google-services.json is gitignored (it's a secret, shared
// out-of-band), so EAS Build can't see it in the uploaded project archive.
// It's instead stored as a secret "file" env var (GOOGLE_SERVICES_JSON) on
// EAS, which resolves to a local temp file path at build time. Locally
// (no EXPO env var set) this falls back to the real file on disk, so
// `npx expo start` / `expo prebuild` are unaffected.
const baseConfig = require("./app.json").expo;

module.exports = {
  expo: {
    ...baseConfig,
    android: {
      ...baseConfig.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || baseConfig.android.googleServicesFile,
    },
  },
};
