// Böyük Loja Messenger — dizayn tokenləri + ThemeProvider.
// Qayda: komponentdə sabit kodlanmış rəng YOXDUR. Hər rəng buradan gəlir.

import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

const light = {
  bg: "#F4F3F1",
  surface: "#FFFFFF",
  surfaceAlt: "#EAE7E2",
  border: "#DFDDD8",
  textPrimary: "#201E1D",
  textSecondary: "#6B6862",
  accent: "#8A6A1C", // YALNIZ fon (düymə, aktiv tab, badge)
  accentPressed: "#6D5314",
  textOnAccent: "#FFFFFF",
  accentLine: "#C9A227", // dekor: nöqtə, altxətt, tab indikatoru
  accentMuted: "#F3EAD2",
  success: "#2F7D52",
  tickRead: "#1E88E5", // "oxundu" qoşa quş (WhatsApp mavisi)
  danger: "#B5240C",
  unread: "#8A6A1C",
  bubbleMine: "#F3EAD2",
  bubbleOther: "#FFFFFF",
  overlay: "rgba(32,30,29,0.40)",
};

const dark = {
  bg: "#17181A",
  surface: "#1F2124",
  surfaceAlt: "#262A2E",
  border: "#34383D",
  textPrimary: "#F2F1EE",
  textSecondary: "#A6A49E",
  accent: "#D4AF37",
  accentPressed: "#B8942A",
  textOnAccent: "#201E1D", // ⚠ dark-da qızıl üzərində TÜND mətn
  accentLine: "#C9A227",
  accentMuted: "#2E2A1C",
  success: "#4CAE7C",
  tickRead: "#53BDEB",
  danger: "#F2624A",
  unread: "#D4AF37",
  bubbleMine: "#3A3220",
  bubbleOther: "#262A2E",
  overlay: "rgba(0,0,0,0.55)",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const typography = {
  display: { fontFamily: "Archivo-Bold", fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontFamily: "Archivo-SemiBold", fontSize: 20, lineHeight: 26 },
  body: { fontFamily: "Archivo-Regular", fontSize: 16, lineHeight: 23 },
  bodySm: { fontFamily: "Archivo-Regular", fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: "Archivo-Regular", fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
};

// iOS shadow + Android elevation. Dark temada kölgə YOX — border + surfaceAlt işlədilir.
const shadowLight = {
  sm: { shadowColor: "#201E1D", shadowOpacity: 0.07, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: "#201E1D", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg: { shadowColor: "#201E1D", shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  none: {},
};
const shadowDark = { sm: {}, md: {}, lg: {}, none: {} };

export const zIndex = { base: 0, header: 10, fab: 20, sheet: 100, toast: 200, dialog: 300 };

export const size = {
  avatar: { xs: 28, sm: 40, md: 48, lg: 72, xl: 88 },
  row: 72,
  rowSetting: 48,
  rowSettingWithHint: 56,
  header: 56,
  tabBar: 64,
  button: 48,
  input: 48,
  search: 40,
  keypadKey: 64,
  touchMin: 44,
};

export const makeTheme = (scheme) => ({
  scheme,
  color: scheme === "dark" ? dark : light,
  spacing,
  radius,
  typography,
  zIndex,
  size,
  shadow: scheme === "dark" ? shadowDark : shadowLight,
});

const ThemeContext = createContext(makeTheme("light"));

export function ThemeProvider({ children, scheme: forced }) {
  const systemScheme = useColorScheme();
  const scheme = forced ?? (systemScheme === "dark" ? "dark" : "light");
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
