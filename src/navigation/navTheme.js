import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export function navigationTheme(t) {
  const base = t.scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: t.color.accent,
      background: t.color.bg,
      card: t.color.surface,
      text: t.color.textPrimary,
      border: t.color.border,
      notification: t.color.danger,
    },
  };
}

export function stackScreenOptions(t) {
  return {
    headerStyle: { backgroundColor: t.color.surface },
    headerTitleStyle: { fontFamily: "Archivo-SemiBold", fontSize: 17, color: t.color.textPrimary },
    headerTintColor: t.color.accent,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: t.color.bg },
  };
}

export function tabScreenOptions(t) {
  return {
    tabBarStyle: {
      backgroundColor: t.color.surface,
      borderTopColor: t.color.border,
      height: t.size.tabBar,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabBarActiveTintColor: t.color.accent,
    tabBarInactiveTintColor: t.color.textSecondary,
    tabBarLabelStyle: { fontFamily: "Archivo-Medium", fontSize: 11 },
  };
}
