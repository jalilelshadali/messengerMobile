import { useEffect, useRef } from "react";
import { Animated, Dimensions, KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme";

export default function BottomSheet({ visible, onClose, children }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.color.overlay }]} onPress={onClose} />
      {/* Edge-to-edge-də adjustResize işləmir — klaviatura üçün KAV lazımdır. */}
      <KeyboardAvoidingView behavior="padding" style={styles.kav}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.color.surface,
              borderColor: t.color.border,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
            },
            t.shadow.lg,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: t.color.border }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  kav: { flex: 1, justifyContent: "flex-end", pointerEvents: "box-none" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
});
