import { useEffect } from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { preventScreenCaptureAsync } from "expo-screen-capture";

import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  useEffect(() => {
    // Screenshots/screen recording aren't blockable on web, and the native
    // module isn't implemented there — only guard native platforms.
    if (Platform.OS !== "web") {
      preventScreenCaptureAsync().catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
