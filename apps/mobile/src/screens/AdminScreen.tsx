import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMyProfile } from "../state/profile";
import type { MoreStackParamList } from "../navigation/MoreStack";

interface AdminCard {
  title: string;
  description: string;
  route?: keyof MoreStackParamList;
}

const ADMIN_SECTIONS: AdminCard[] = [
  { title: "Members", description: "View and manage community members", route: "AdminMembers" },
  { title: "Instructors", description: "View and manage instructors", route: "AdminInstructors" },
  { title: "Posts Moderation", description: "Review and moderate feed content", route: "AdminPostsModeration" },
];

export default function AdminScreen() {
  const { profile, loading } = useMyProfile();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <View style={styles.centered}>
        <Text style={styles.blockedTitle}>Not Authorized</Text>
        <Text style={styles.blockedBody}>
          You do not have access to this area.
        </Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Admin Dashboard</Text>
      <Text style={styles.intro}>
        Manage your community from here. Select a section below.
      </Text>

      {ADMIN_SECTIONS.map((section) => (
        <Pressable
          key={section.title}
          style={styles.card}
          onPress={section.route ? () => (navigation.navigate as (screen: string) => void)(section.route!) : undefined}
          disabled={!section.route}
        >
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardDescription}>{section.description}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },
  intro: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  card: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
  blockedBody: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
