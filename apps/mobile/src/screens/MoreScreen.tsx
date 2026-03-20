import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MoreStack";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

interface MenuItem {
  label: string;
  screen: keyof MoreStackParamList;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Directory", screen: "DirectoryList" },
  { label: "Questions", screen: "QuestionsList" },
];

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.screen}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen as never)}
        >
          <Text style={styles.menuItemText}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { padding: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
  chevron: {
    fontSize: 20,
    color: "#999",
  },
});
