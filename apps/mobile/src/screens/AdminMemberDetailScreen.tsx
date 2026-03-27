import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile, ProfileAdminUpdate, ProfileRole } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import { displayRole, roleBadgeColors } from "../lib/roles";
import { useAuth } from "../state/auth";
import type { MoreStackParamList } from "../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "AdminMemberDetail">;

const ASSIGNABLE_ROLES: ProfileRole[] = ["member", "tutor", "admin"];

export default function AdminMemberDetailScreen({ route, navigation }: Props) {
  const { profileId } = route.params;
  const { session } = useAuth();
  const isSelf = session?.user?.id === profileId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable state — initialised from fetched profile
  const [role, setRole] = useState<ProfileRole>("member");
  const [isListedAsTutor, setIsListedAsTutor] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  // Derived governance flags
  const selfRoleBlocked = isSelf;
  const selfDisableBlocked = isSelf;
  const instructorToggleDisabled = role !== "tutor";

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Failed to load member");
      setLoading(false);
      return;
    }

    const p = data as Profile;
    setProfile(p);
    setRole(p.role);
    setIsListedAsTutor(p.is_listed_as_tutor);
    setIsDisabled(p.is_disabled);
    setLoading(false);

    if (p.avatar_path) {
      const result = await createSignedUrl(
        supabase,
        STORAGE_BUCKETS.PROFILE_AVATARS,
        p.avatar_path,
      );
      if (result.signedUrl) setAvatarUrl(result.signedUrl);
    }
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ------------------------------------------------------------------
  // Role change handler — clears instructor listing when leaving tutor
  // ------------------------------------------------------------------

  const handleRoleChange = (newRole: ProfileRole) => {
    if (selfRoleBlocked) return;
    setRole(newRole);
    if (newRole !== "tutor") {
      setIsListedAsTutor(false);
    }
  };

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------

  const hasChanges =
    profile !== null &&
    (role !== profile.role ||
      isListedAsTutor !== profile.is_listed_as_tutor ||
      isDisabled !== profile.is_disabled);

  const handleSave = async () => {
    if (!profile || saving) return;

    const update: ProfileAdminUpdate = {};
    if (role !== profile.role) update.role = role;
    if (isListedAsTutor !== profile.is_listed_as_tutor)
      update.is_listed_as_tutor = isListedAsTutor;
    if (isDisabled !== profile.is_disabled) update.is_disabled = isDisabled;

    if (Object.keys(update).length === 0) return;

    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", profileId);

    if (updateError) {
      Alert.alert("Error", updateError.message);
      setSaving(false);
      return;
    }

    // Refresh local state from DB
    await fetchProfile();
    setSaving(false);
    Alert.alert("Saved", "Member updated successfully.");
  };

  // ------------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Member not found"}</Text>
        <Pressable style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const name = profile.full_name || "Unknown";
  const badge = roleBadgeColors(profile.role);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* ---- Profile summary ---- */}
      <View style={styles.summaryCard}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
          </View>
        )}

        <Text style={styles.profileName}>{name}</Text>

        <View style={styles.currentBadgeRow}>
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
          {profile.is_disabled && (
            <View style={styles.disabledBadge}>
              <Text style={styles.disabledBadgeText}>DISABLED</Text>
            </View>
          )}
        </View>

        {profile.headline ? (
          <Text style={styles.headline}>{profile.headline}</Text>
        ) : null}
        {profile.program || profile.grad_year ? (
          <Text style={styles.meta}>
            {[profile.program, profile.grad_year].filter(Boolean).join(" · ")}
          </Text>
        ) : null}

        {isSelf && (
          <View style={styles.selfNote}>
            <Text style={styles.selfNoteText}>
              This is your account — role and disable controls are locked.
              {role === "tutor"
                ? " You can still update your Instructor listing."
                : " Instructor listing is only available for the Instructor role."}
            </Text>
          </View>
        )}
      </View>

      {/* ---- Role ---- */}
      <View style={[styles.section, selfRoleBlocked && styles.sectionBlocked]}>
        <Text style={styles.sectionTitle}>Role</Text>
        {selfRoleBlocked && (
          <Text style={styles.blockedHint}>
            You cannot change your own role. Another admin must do this.
          </Text>
        )}
        <View style={[styles.roleOptions, selfRoleBlocked && styles.blockedOverlay]}>
          {ASSIGNABLE_ROLES.map((r) => {
            const selected = r === role;
            return (
              <Pressable
                key={r}
                style={[
                  styles.roleChip,
                  selected && styles.roleChipSelected,
                  selfRoleBlocked && styles.roleChipDisabled,
                ]}
                onPress={() => handleRoleChange(r)}
                disabled={selfRoleBlocked}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    selected && styles.roleChipTextSelected,
                  ]}
                >
                  {displayRole(r)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ---- Instructor listing ---- */}
      <View style={[styles.section, instructorToggleDisabled && styles.sectionBlocked]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.sectionTitle}>Instructor Listing</Text>
            <Text style={styles.toggleHint}>
              {instructorToggleDisabled
                ? "Only applies to members with the Instructor role"
                : "Show this member on the Instructors page"}
            </Text>
          </View>
          <Switch
            value={isListedAsTutor}
            onValueChange={setIsListedAsTutor}
            disabled={instructorToggleDisabled}
          />
        </View>
      </View>

      {/* ---- Disable / Enable ---- */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.sectionTitle}>Account Disabled</Text>
            <Text style={styles.toggleHint}>
              {isSelf
                ? "You cannot disable your own account"
                : "Disabled accounts cannot access the app"}
            </Text>
          </View>
          <Switch
            value={isDisabled}
            onValueChange={setIsDisabled}
            disabled={isSelf}
          />
        </View>
      </View>

      {/* ---- Save ---- */}
      <Pressable
        style={[
          styles.saveButton,
          (!hasChanges || saving) && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#c00",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontWeight: "600" },

  // Summary card
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 28, fontWeight: "bold", color: "#555" },
  profileName: { fontSize: 20, fontWeight: "700", color: "#111" },
  currentBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  disabledBadge: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  disabledBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b91c1c",
    letterSpacing: 0.5,
  },
  headline: { fontSize: 14, color: "#555", marginTop: 8, textAlign: "center" },
  meta: { fontSize: 13, color: "#888", marginTop: 4 },
  selfNote: {
    marginTop: 10,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selfNoteText: { fontSize: 12, color: "#1d4ed8", fontWeight: "600", textAlign: "center" },

  // Blocked / disabled section styling
  sectionBlocked: { opacity: 0.6 },
  blockedHint: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 4,
    fontStyle: "italic",
  },
  blockedOverlay: { opacity: 0.7 },
  roleChipDisabled: { opacity: 0.8 },

  // Sections
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#222" },

  // Role picker
  roleOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  roleChipSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  roleChipText: { fontSize: 14, color: "#444", fontWeight: "500" },
  roleChipTextSelected: { color: "#fff" },

  // Toggle rows
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: { flex: 1, marginRight: 12 },
  toggleHint: { fontSize: 12, color: "#888", marginTop: 2 },

  // Save
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
