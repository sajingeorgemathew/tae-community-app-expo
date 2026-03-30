import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMyProfile } from "../state/profile";
import { supabase } from "../lib/supabase";
import type { MoreStackParamList } from "../navigation/MoreStack";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SummaryCounts {
  totalMembers: number | null;
  totalInstructors: number | null;
  disabledUsers: number | null;
  recentPosts: number | null;
}

const INITIAL_COUNTS: SummaryCounts = {
  totalMembers: null,
  totalInstructors: null,
  disabledUsers: null,
  recentPosts: null,
};

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                      */
/* ------------------------------------------------------------------ */

async function fetchCounts(): Promise<SummaryCounts> {
  const [members, instructors, disabled, posts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "tutor"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_disabled", true),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    totalMembers: members.count ?? null,
    totalInstructors: instructors.count ?? null,
    disabledUsers: disabled.count ?? null,
    recentPosts: posts.count ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminScreen() {
  const { profile, loading } = useMyProfile();
  const navigation =
    useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const isFocused = useIsFocused();

  const [counts, setCounts] = useState<SummaryCounts>(INITIAL_COUNTS);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadCounts = useCallback(async () => {
    try {
      setCountsError(false);
      const c = await fetchCounts();
      setCounts(c);
    } catch {
      setCountsError(true);
    }
  }, []);

  // Initial load + refetch on screen focus
  useEffect(() => {
    if (!isFocused || profile?.role !== "admin") return;
    let cancelled = false;
    setCountsLoading(true);
    loadCounts().finally(() => {
      if (!cancelled) setCountsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isFocused, profile?.role, loadCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCounts();
    setRefreshing(false);
  }, [loadCounts]);

  /* ---- Auth guard ---- */

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
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  /* ---- Dashboard ---- */

  const nav = (route: keyof MoreStackParamList) =>
    (navigation.navigate as (screen: string) => void)(route);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Admin Dashboard</Text>
      <Text style={styles.intro}>Community overview and quick actions.</Text>

      {/* ---------- Summary cards ---------- */}
      <Text style={styles.sectionTitle}>Summary</Text>

      {countsLoading && !refreshing ? (
        <View style={styles.countsLoader}>
          <ActivityIndicator size="small" />
        </View>
      ) : countsError ? (
        <View style={styles.countsError}>
          <Text style={styles.countsErrorText}>
            Could not load summary counts.
          </Text>
          <Pressable onPress={onRefresh}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Members"
            value={counts.totalMembers}
            color="#1d4ed8"
            bg="#dbeafe"
          />
          <SummaryCard
            label="Instructors"
            value={counts.totalInstructors}
            color="#047857"
            bg="#d1fae5"
          />
          <SummaryCard
            label="Disabled"
            value={counts.disabledUsers}
            color="#b91c1c"
            bg="#fde8e8"
          />
          <SummaryCard
            label="Posts"
            value={counts.recentPosts}
            color="#7c3aed"
            bg="#ede9fe"
          />
        </View>
      )}

      {/* ---------- Quick links ---------- */}
      <Text style={styles.sectionTitle}>Manage</Text>

      <Pressable style={styles.linkCard} onPress={() => nav("AdminMembers")}>
        <View
          style={[styles.linkIcon, { backgroundColor: "#dbeafe" }]}
        >
          <Text style={[styles.linkIconText, { color: "#1d4ed8" }]}>M</Text>
        </View>
        <View style={styles.linkContent}>
          <Text style={styles.linkTitle}>Members</Text>
          <Text style={styles.linkDescription}>
            View and manage community members
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable
        style={styles.linkCard}
        onPress={() => nav("AdminInstructors")}
      >
        <View
          style={[styles.linkIcon, { backgroundColor: "#d1fae5" }]}
        >
          <Text style={[styles.linkIconText, { color: "#047857" }]}>I</Text>
        </View>
        <View style={styles.linkContent}>
          <Text style={styles.linkTitle}>Instructors</Text>
          <Text style={styles.linkDescription}>
            View and manage instructor listings
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable
        style={styles.linkCard}
        onPress={() => nav("AdminPostsModeration")}
      >
        <View
          style={[styles.linkIcon, { backgroundColor: "#ede9fe" }]}
        >
          <Text style={[styles.linkIconText, { color: "#7c3aed" }]}>P</Text>
        </View>
        <View style={styles.linkContent}>
          <Text style={styles.linkTitle}>Posts Moderation</Text>
          <Text style={styles.linkDescription}>
            Review and moderate feed content
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary card sub-component                                         */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number | null;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={[styles.summaryValue, { color }]}>
        {value !== null ? value : "–"}
      </Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { padding: 16, paddingBottom: 32 },
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
    marginBottom: 4,
  },
  intro: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  /* Summary cards */
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 10,
    padding: 14,
    minWidth: "47%",
    flexGrow: 1,
    flexBasis: "47%",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  countsLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  countsError: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  countsErrorText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  retryText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Quick link cards */
  linkCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  linkIconText: {
    fontSize: 18,
    fontWeight: "700",
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: 13,
    color: "#666",
  },
  chevron: {
    fontSize: 22,
    color: "#bbb",
    fontWeight: "300",
    marginLeft: 8,
  },

  /* Auth guard */
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
