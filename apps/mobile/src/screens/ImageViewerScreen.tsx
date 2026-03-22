import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";

type Props = NativeStackScreenProps<FeedStackParamList, "ImageViewer">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ImageViewerScreen({ route, navigation }: Props) {
  const { uri } = route.params;

  return (
    <View style={styles.root}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
      />
      <Pressable
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        hitSlop={12}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
  closeButton: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
