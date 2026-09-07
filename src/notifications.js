import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import client from "./api/client";

// Expo Go dropped Android push notification support in SDK 53+ — merely
// IMPORTING expo-notifications there throws a hard error as a module-level
// side effect (before any of our own code runs), so a static top-level
// `import` is unsafe here: it would evaluate eagerly at app boot regardless
// of any guard placed around its usage. A lazy require() behind this check
// means the module is never touched at all under Expo Go. The real
// standalone APK build is unaffected (executionEnvironment is "standalone"
// there); this only matters for local Expo Go testing.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo) {
  Notifications = require("expo-notifications");
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
  if (isExpoGo || !Notifications) return;
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
