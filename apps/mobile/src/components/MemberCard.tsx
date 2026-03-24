import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { Profile } from "@tae/shared";
import { displayRole, roleBadgeColors } from "../lib/roles";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MemberCardProps {
  profile: Profile;
  avatarUrl?: string;
  /** Called when avatar or name is tapped. Falls back to no-op. */
  onPressProfile?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function displayName(profile: Profile): string {
  return profile.full_name || "Unknown";
}

function metaLine(profile: Profile): string | null {
  const parts: string[] = [];
  if (profile.program) parts.push(profile.program);
  if (profile.grad_year) parts.push(String(profile.grad_year));
  return parts.length > 0 ? parts.join(" \u00B7 ") : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MemberCard({
  profile,
  avatarUrl,
  onPressProfile,
}: MemberCardProps) {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const [messaging, setMessaging] = useState(false);

  const isSelf = session?.user?.id === profile.id;
  const badge = roleBadgeColors(profile.role);
  const name = displayName(profile);
  const meta = metaLine(profile);

  const handleMessage = async () => {
    if (messaging || isSelf) return;
    setMessaging(true);
    try {
      const { data, error } = await supabase.rpc("create_conversation_1to1", {
        other_user_id: profile.id,
      });
      if (error) throw new Error(error.message);
      const conversationId = data as string;
      navigation.navigate("Messages", {
        screen: "Conversation",
        params: { conversationId, otherUserName: name },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not start conversation");
    } finally {
      setMessaging(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header: avatar + name + badge */}
      <Pressable style={styles.header} onPress={onPressProfile}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {name[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              <Text style={[styles.badgeText, { color: badge.text }]}>
                {displayRole(profile.role).toUpperCase()}
              </Text>
            </View>
          </View>
          {profile.headline ? (
            <Text style={styles.headline} numberOfLines={2}>
              {profile.headline}
            </Text>
          ) : null}
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* Actions row */}
      <View style={styles.actions}>
        <Pressable
          style={styles.profileBtn}
          onPress={onPressProfile}
        >
          <Text style={styles.profileBtnText}>View Profile</Text>
        </Pressable>
        {!isSelf ? (
          <Pressable
            style={[styles.messageBtn, messaging && styles.messageBtnDisabled]}
            onPress={handleMessage}
            disabled={messaging}
          >
            {messaging ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.messageBtnText}>Message</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    padding: 14,
    alignItems: "flex-start",
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 22, fontWeight: "bold", color: "#555" },
  headerText: { marginLeft: 12, flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  name: { fontSize: 16, fontWeight: "600", color: "#111", flexShrink: 1 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  headline: { fontSize: 13, color: "#555", marginTop: 3, lineHeight: 18 },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },

  actions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  profileBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  profileBtnText: { fontSize: 13, fontWeight: "600", color: "#333" },
  messageBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  messageBtnDisabled: { opacity: 0.6 },
  messageBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
