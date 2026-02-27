import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../state/auth";

export default function MeScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Me</Text>
      <Text style={styles.subtitle}>
        {session?.user.email ?? session?.user.id ?? "Unknown user"}
      </Text>
      <View style={styles.spacer} />
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666" },
  spacer: { height: 24 },
});
