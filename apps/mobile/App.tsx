import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";

import {
  getInitialSession,
  subscribeToAuthChanges,
  signOutSafe,
} from "@tae/shared";
import { supabase } from "./src/lib/supabase";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // --- auth bootstrap ---
  useEffect(() => {
    getInitialSession(supabase).then((s) => {
      setSession(s);
      setLoading(false);
    });

    const unsub = subscribeToAuthChanges(supabase, (_event, s) => {
      setSession(s);
    });

    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.label}>Restoring session…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (session) {
    return <SignedInView session={session} />;
  }

  return <SignedOutView />;
}

// ── Signed-in screen ────────────────────────────────────────────────────────

function SignedInView({ session }: { session: Session }) {
  const handleSignOut = async () => {
    await signOutSafe(supabase);
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Signed In</Text>
      <Text style={styles.label}>{session.user.email ?? session.user.id}</Text>
      <View style={styles.spacer} />
      <Button title="Sign Out" onPress={handleSignOut} />
      <StatusBar style="auto" />
    </View>
  );
}

// ── Signed-out screen (email/password stub) ─────────────────────────────────

function SignedOutView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Sign-in failed", error.message);
    }
  };

  return (
    <View style={styles.center}>
      <Text style={styles.title}>TAE Community</Text>
      <Text style={styles.label}>Signed out</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button
        title={busy ? "Signing in…" : "Sign In"}
        onPress={handleSignIn}
        disabled={busy}
      />
      <StatusBar style="auto" />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  spacer: {
    height: 16,
  },
});
