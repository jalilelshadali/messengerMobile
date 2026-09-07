import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import client from "./api/client";

// Expo Go dropped Android push notification support in SDK 53+ — any use of
// expo-notifications there throws a hard error, not just a warning. The real
// standalone APK build is unaffected (executionEnvironment is "standalone"
// there); this only matters for local Expo Go testing.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications() {
  if (isExpoGo) return;
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#d4af37",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const { data: token } = await Notifications.getDevicePushTokenAsync();
  if (!token) return;

  try {
    await client.post("/notifications/register-token/", { token });
  } catch {
    // Non-fatal — user just won't receive push until the next successful registration.
  }
}
