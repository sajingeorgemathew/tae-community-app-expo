import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Profile } from "@tae/shared";
import { useAuth } from "../state/auth";
import { supabase } from "../lib/supabase";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";

/**
 * Fetches the current user's profile and checks `is_disabled`.
 * Returns the profile when active, or `null` while loading.
 * Calls `onDisabled` once when a disabled account is detected.
 */
function useDisabledGate(userId: string | undefined, onDisabled: () => void) {
  const [checking, setChecking] = useState(true);
  const [disabled, setDisabled] = useState(false);

  const check = useCallback(async () => {
    if (!userId) {
      setDisabled(false);
      setChecking(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("is_disabled")
      .eq("id", userId)
      .single();

    setDisabled(
      !!(data && (data as Pick<Profile, "is_disabled">).is_disabled),
    );
    setChecking(false);
  }, [userId]);

  // Reset to checking state when userId changes (sign-out → sign-in)
  useEffect(() => {
    setChecking(true);
    setDisabled(false);
    check();
  }, [check]);

  // Trigger sign-out after a brief delay so the user can see the notice
  useEffect(() => {
    if (!disabled) return;
    const timer = setTimeout(onDisabled, 3500);
    return () => clearTimeout(timer);
  }, [disabled, onDisabled]);

  return { checking, disabled };
}

export default function RootNavigator() {
  const { session, loading, signOut } = useAuth();

  const handleDisabled = useCallback(() => {
    signOut();
  }, [signOut]);

  const { checking, disabled } = useDisabledGate(
    session?.user?.id,
    handleDisabled,
  );

  if (loading || (session && checking)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.label}>Restoring session…</Text>
      </View>
    );
  }

  if (session && disabled) {
    return (
      <View style={styles.center}>
        <Text style={styles.disabledTitle}>Account Disabled</Text>
        <Text style={styles.disabledBody}>
          Your account has been disabled by an administrator.{"\n"}
          You will be signed out shortly.
        </Text>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out Now</Text>
        </Pressable>
      </View>
    );
  }

  return session ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  disabledTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#b91c1c",
    marginBottom: 12,
  },
  disabledBody: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#b91c1c",
    borderRadius: 8,
  },
  signOutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
