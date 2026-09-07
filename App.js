import { useEffect, useRef } from "react";
import { AppState, Platform, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { useFonts } from "expo-font";
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from "@expo-google-fonts/archivo";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationTheme } from "./src/navigation/navTheme";
import { ThemeProvider, useTheme } from "./src/theme";

const RELOCK_AFTER_MS = 60_000;

function AppShell() {
  const { lockNow, locked } = useAuth();
  const t = useTheme();
  const backgroundedAt = useRef(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
      } else if (state === "active") {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since && Date.now() - since > RELOCK_AFTER_MS && !locked) {
          lockNow();
        }
      }
    });
    return () => sub.remove();
  }, [lockNow, locked]);

  return (
    <NavigationContainer theme={navigationTheme(t)}>
      <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// Tema rejimi Parametrlərdən gəlir (sistem/işıqlı/qaranlıq).
function Themed() {
  const { settings } = useSettings();
  const forced = settings.themeMode === "system" ? undefined : settings.themeMode;
  return (
    <ThemeProvider scheme={forced}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    "Archivo-Regular": Archivo_400Regular,
    "Archivo-Medium": Archivo_500Medium,
    "Archivo-SemiBold": Archivo_600SemiBold,
    "Archivo-Bold": Archivo_700Bold,
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      preventScreenCaptureAsync().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {fontsLoaded ? (
        <SettingsProvider>
          <Themed />
        </SettingsProvider>
      ) : (
        <View style={{ flex: 1, backgroundColor: "#F4F3F1" }} />
      )}
    </SafeAreaProvider>
  );
}
