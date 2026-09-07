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
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./src/theme";

// App arxa plana keçib bu qədər müddətdən çox qalıbsa, qayıdanda PIN soruşulur.
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
    <NavigationContainer>
      <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
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
    // Screenshot/ekran yazısı web-də bloklana bilmir — yalnız native.
    if (Platform.OS !== "web") {
      preventScreenCaptureAsync().catch(() => {});
    }
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#F4F3F1" }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
