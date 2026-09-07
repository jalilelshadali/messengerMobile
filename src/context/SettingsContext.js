import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "app.settings";
const DEFAULTS = { themeMode: "system", notifications: true, sound: true };

const SettingsContext = createContext({ settings: DEFAULTS, setSetting: () => {}, ready: false });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  function setSetting(key, value) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  return (
    <SettingsContext.Provider value={{ settings, setSetting, ready }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
