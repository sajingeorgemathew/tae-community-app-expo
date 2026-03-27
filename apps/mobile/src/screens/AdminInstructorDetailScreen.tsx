import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile, Course } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import { roleBadgeColors } from "../lib/roles";
import { emitAdminMemberChange } from "../state/adminMemberEvents";
import type { MoreStackParamList } from "../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "AdminInstructorDetail">;

export default function AdminInstructorDetailScreen({
  route,
}: Props) {
  const { profileId } = route.params;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Course assignment state
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------------------
  // Fetch profile
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
      setError(fetchError?.message ?? "Failed to load instructor");
      setLoading(false);
      return;
    }

    const p = data as Profile;
    setProfile(p);
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

  // ------------------------------------------------------------------
  // Fetch courses & assignments
  // ------------------------------------------------------------------

  const fetchCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, code, title, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (data) setAllCourses(data as Course[]);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const { data } = await supabase
      .from("tutor_course_assignments")
      .select("course_id")
      .eq("tutor_id", profileId);

    if (data) {
      setAssignedCourseIds(data.map((a) => a.course_id));
    }
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
    fetchCourses();
    fetchAssignments();
  }, [fetchProfile, fetchCourses, fetchAssignments]);

  // ------------------------------------------------------------------
  // Assignment mutations
  // ------------------------------------------------------------------

  const handleAssignCourse = async (courseId: string) => {
    setSaving(true);
    const { error: insertError } = await supabase
      .from("tutor_course_assignments")
      .upsert(
        [{ tutor_id: profileId, course_id: courseId }],
        { onConflict: "tutor_id,course_id" },
      );

    if (insertError) {
      Alert.alert("Error", insertError.message);
      setSaving(false);
      return;
    }

    setAssignedCourseIds((prev) => [...prev, courseId]);
    setSaving(false);
    emitAdminMemberChange();
  };

  const handleRemoveCourse = async (courseId: string) => {
    Alert.alert(
      "Remove Assignment",
      "Remove this course assignment from this instructor?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            const { error: deleteError } = await supabase
              .from("tutor_course_assignments")
              .delete()
              .eq("tutor_id", profileId)
              .eq("course_id", courseId);

            if (deleteError) {
              Alert.alert("Error", deleteError.message);
              setSaving(false);
              return;
            }

            setAssignedCourseIds((prev) =>
              prev.filter((id) => id !== courseId),
            );
            setSaving(false);
            emitAdminMemberChange();
          },
        },
      ],
    );
  };

  // ------------------------------------------------------------------
  // Render
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
        <Text style={styles.errorText}>{error ?? "Instructor not found"}</Text>
        <Pressable style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const name = profile.full_name || "Unknown";
  const badge = roleBadgeColors(profile.role);

  const assignedCourses = allCourses.filter((c) =>
    assignedCourseIds.includes(c.id),
  );
  const availableCourses = allCourses.filter(
    (c) => !assignedCourseIds.includes(c.id),
  );

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

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: badge.bg, borderColor: badge.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: badge.text }]}>
              INSTRUCTOR
            </Text>
          </View>
          {profile.is_listed_as_tutor ? (
            <Text style={styles.listedTag}>Listed</Text>
          ) : (
            <Text style={styles.unlistedTag}>Not Listed</Text>
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
      </View>

      {/* ---- Current assignments ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Assigned Courses ({assignedCourses.length})
        </Text>

        {assignedCourses.length === 0 ? (
          <Text style={styles.emptyHint}>No courses assigned yet.</Text>
        ) : (
          assignedCourses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseCode}>{course.code}</Text>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {course.title}
                </Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemoveCourse(course.id)}
                disabled={saving}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* ---- Available courses to assign ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Available Courses ({availableCourses.length})
        </Text>

        {availableCourses.length === 0 ? (
          <Text style={styles.emptyHint}>
            All active courses are already assigned.
          </Text>
        ) : (
          availableCourses.map((course) => (
            <View key={course.id} style={styles.courseRow}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseCode}>{course.code}</Text>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {course.title}
                </Text>
              </View>
              <Pressable
                style={styles.assignButton}
                onPress={() => handleAssignCourse(course.id)}
                disabled={saving}
              >
                <Text style={styles.assignButtonText}>Assign</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  listedTag: { fontSize: 12, color: "#047857", fontWeight: "600" },
  unlistedTag: { fontSize: 12, color: "#b45309", fontWeight: "600" },
  headline: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
    textAlign: "center",
  },
  meta: { fontSize: 13, color: "#888", marginTop: 4 },

  // Sections
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 10,
  },
  emptyHint: { fontSize: 13, color: "#999", fontStyle: "italic" },

  // Course rows
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  courseInfo: { flex: 1, marginRight: 12 },
  courseCode: { fontSize: 14, fontWeight: "700", color: "#333" },
  courseTitle: { fontSize: 13, color: "#666", marginTop: 2 },

  // Buttons
  removeButton: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  removeButtonText: { fontSize: 13, fontWeight: "600", color: "#b91c1c" },
  assignButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  assignButtonText: { fontSize: 13, fontWeight: "600", color: "#1d4ed8" },

  // Saving indicator
  savingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  savingText: { fontSize: 13, color: "#007AFF" },
});
