import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import { useTheme } from "../theme";

const W = 46;
const H = 28;
const KNOB = 22;

export default function Toggle({ value, onValueChange, disabled = false }) {
  const t = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [value, x]);

  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [3, W - KNOB - 3] });
  const bg = x.interpolate({
    inputRange: [0, 1],
    outputRange: [t.color.surfaceAlt, t.color.accent],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={{ opacity: disabled ? 0.4 : 1 }}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: bg, borderColor: value ? "transparent" : t.color.border },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: value ? t.color.textOnAccent : t.color.surface, transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, borderWidth: 1, justifyContent: "center" },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, position: "absolute" },
});
