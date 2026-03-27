import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import MemberCard from "../components/MemberCard";
import { useOnlineUsers } from "../hooks/useOnlineUsers";
import { onAdminMemberChange } from "../state/adminMemberEvents";
import type { FacultyStackParamList } from "../navigation/FacultyStack";

type Props = NativeStackScreenProps<FacultyStackParamList, "FacultyList">;

const FETCH_LIMIT = 100;

/** course_id → code lookup + per-tutor assigned codes */
interface CourseMap {
  /** tutor_id → sorted course codes */
  byTutor: Record<string, string[]>;
  /** All distinct course codes that appear in at least one assignment */
  allCodes: string[];
}

export default function FacultyScreen({ navigation }: Props) {
  const [faculty, setFaculty] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avatarCache = useRef<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const [courseMap, setCourseMap] = useState<CourseMap>({ byTutor: {}, allCodes: [] });
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const facultyIds = faculty.map((p) => p.id);
  const { online: onlineUsers } = useOnlineUsers(facultyIds);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_listed_as_tutor", true)
      .eq("is_disabled", false)
      .order("full_name", { ascending: true })
      .limit(FETCH_LIMIT);

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Failed to load faculty");
      setLoading(false);
      return;
    }

    const list = data as Profile[];
    setFaculty(list);

    // Fetch course assignments with joined course code
    const tutorIds = list.map((p) => p.id);
    if (tutorIds.length > 0) {
      const { data: assignments } = await supabase
        .from("tutor_course_assignments")
        .select("tutor_id, course_id, courses(code)")
        .in("tutor_id", tutorIds);

      if (assignments) {
        const byTutor: Record<string, string[]> = {};
        const codeSet = new Set<string>();

        for (const a of assignments as unknown as Array<{
          tutor_id: string;
          course_id: string;
          courses: { code: string };
        }>) {
          const code = a.courses?.code;
          if (!code) continue;
          if (!byTutor[a.tutor_id]) byTutor[a.tutor_id] = [];
          byTutor[a.tutor_id].push(code);
          codeSet.add(code);
        }

        // Sort each tutor's codes alphabetically
        for (const id of Object.keys(byTutor)) {
          byTutor[id].sort();
        }

        setCourseMap({
          byTutor,
          allCodes: Array.from(codeSet).sort(),
        });
      }
    }

    setLoading(false);

    // Resolve avatar signed URLs in background
    const toResolve = list.filter(
      (p) => p.avatar_path && !avatarCache.current.has(p.avatar_path),
    );

    if (toResolve.length > 0) {
      const resolved: Record<string, string> = {};
      await Promise.all(
        toResolve.map(async (p) => {
          if (!p.avatar_path) return;
          const result = await createSignedUrl(
            supabase,
            STORAGE_BUCKETS.PROFILE_AVATARS,
            p.avatar_path,
          );
          if (result.signedUrl) {
            avatarCache.current.set(p.avatar_path!, result.signedUrl);
            resolved[p.avatar_path!] = result.signedUrl;
          }
        }),
      );
      setAvatarUrls((prev) => ({ ...prev, ...resolved }));
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  // Refetch when an admin mutation is saved elsewhere
  useEffect(() => {
    return onAdminMemberChange(() => {
      fetchFaculty();
    });
  }, [fetchFaculty]);

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  // Apply course filter
  const filtered = useMemo(() => {
    if (!selectedCourse) return faculty;
    return faculty.filter((p) =>
      courseMap.byTutor[p.id]?.includes(selectedCourse),
    );
  }, [faculty, selectedCourse, courseMap]);

  if (loading && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading faculty…</Text>
      </View>
    );
  }

  if (error && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchFaculty}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!loading && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No faculty members found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Course filter chips */}
      {courseMap.allCodes.length > 0 && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              style={[
                styles.filterChip,
                selectedCourse === null && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCourse(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCourse === null && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {courseMap.allCodes.map((code) => (
              <Pressable
                key={code}
                style={[
                  styles.filterChip,
                  selectedCourse === code && styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedCourse((prev) => (prev === code ? null : code))
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCourse === code && styles.filterChipTextActive,
                  ]}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MemberCard
            profile={item}
            avatarUrl={getAvatarUrl(item.avatar_path)}
            isOnline={onlineUsers.has(item.id)}
            courseTags={courseMap.byTutor[item.id]}
            onPressProfile={() =>
              navigation.navigate("FacultyDetail", { profileId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          selectedCourse ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                No instructors assigned to {selectedCourse}.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center", marginBottom: 16 },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  list: { paddingVertical: 8 },

  filterContainer: {
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: "#f5f5f5",
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterChipActive: {
    backgroundColor: "#4338ca",
    borderColor: "#4338ca",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  filterChipTextActive: {
    color: "#fff",
  },
});
