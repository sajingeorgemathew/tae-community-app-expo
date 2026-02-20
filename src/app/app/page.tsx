"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import StatCard from "@/src/components/StatCard";
import { useAppMetrics } from "@/src/lib/AppMetricsContext";
import type { User } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RecentPost {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar_path: string | null;
}

interface RecentQuestion {
  id: string;
  title: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar_path: string | null;
  answer_count: number;
}

interface SearchResult {
  id: string;
  full_name: string | null;
  role: string | null;
  program: string | null;
  avatar_path: string | null;
  skills: string[] | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "\u2026";
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG to avoid extra deps)                             */
/* ------------------------------------------------------------------ */

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function QaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AppPage() {
  const router = useRouter();
  const { resolveAvatarUrls } = useAvatarUrls();
  const { unreadMessagesCount, qaActivityCount, onlineMembersCount } = useAppMetrics();

  /* ---------- auth / profile ---------- */
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  /* ---------- recent posts ---------- */
  const [posts, setPosts] = useState<RecentPost[]>([]);
  const [postAvatarUrls, setPostAvatarUrls] = useState<Record<string, string>>({});
  const [postsLoading, setPostsLoading] = useState(true);

  /* ---------- recent questions ---------- */
  const [questions, setQuestions] = useState<RecentQuestion[]>([]);
  const [questionAvatarUrls, setQuestionAvatarUrls] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(true);

  /* ---------- quick search ---------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchAvatarUrls, setSearchAvatarUrls] = useState<Record<string, string>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // Profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_path, headline, skills, program, grad_year, created_at")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setFullName((profile.full_name as string) || "");
        const hasAvatar = !!profile.avatar_path;
        const hasHeadline = !!(profile.headline as string | null)?.trim();
        const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
        const hasProgramYear = !!(profile.program as string | null)?.trim() && !!profile.grad_year;
        if (!(hasAvatar && hasHeadline && hasSkills && hasProgramYear)) {
          setProfileIncomplete(true);
          const missing: string[] = [];
          if (!hasAvatar) missing.push("Profile photo");
          if (!hasHeadline) missing.push("Headline");
          if (!hasSkills) missing.push("Skills");
          if (!hasProgramYear) missing.push("Program & grad year");
          setMissingFields(missing);
        }
      }

      setLoading(false);

      // --- Recent Posts (3) ---
      (async () => {
        try {
          const { data: postRows } = await supabase
            .from("posts")
            .select("id, content, created_at, author_id, profiles(full_name, avatar_path)")
            .order("created_at", { ascending: false })
            .limit(3);

          if (postRows && postRows.length > 0) {
            const mapped = postRows.map((row: Record<string, unknown>) => {
              const profiles = row.profiles;
              const p = Array.isArray(profiles) ? profiles[0] : profiles;
              const prof = p as Record<string, unknown> | null;
              return {
                id: row.id as string,
                content: row.content as string,
                created_at: row.created_at as string,
                author_id: row.author_id as string,
                author_name: (prof?.full_name as string) ?? "Unknown",
                author_avatar_path: (prof?.avatar_path as string) ?? null,
              };
            });
            setPosts(mapped);

            // Resolve avatars
            const avatarProfiles = mapped
              .filter((m) => m.author_avatar_path)
              .map((m) => ({ id: m.author_id, avatar_path: m.author_avatar_path }));
            if (avatarProfiles.length > 0) {
              const urls = await resolveAvatarUrls(avatarProfiles);
              setPostAvatarUrls(urls);
            }
          }
        } catch {
          // leave empty
        }
        setPostsLoading(false);
      })();

      // --- Recent Questions (3) ---
      (async () => {
        try {
          const { data: qRows } = await supabase.rpc("get_questions_feed", {
            limit_count: 3,
          });

          if (Array.isArray(qRows) && qRows.length > 0) {
            const mapped = qRows.map(
              (r: {
                id: string;
                title: string;
                created_at: string;
                author_id: string;
                author_name: string;
                author_avatar_path: string | null;
                answer_count: number;
              }) => ({
                id: r.id,
                title: r.title,
                created_at: r.created_at,
                author_id: r.author_id,
                author_name: r.author_name ?? "Unknown",
                author_avatar_path: r.author_avatar_path,
                answer_count: r.answer_count ?? 0,
              })
            );
            setQuestions(mapped);

            const avatarProfiles = mapped
              .filter((m) => m.author_avatar_path)
              .map((m) => ({ id: m.author_id, avatar_path: m.author_avatar_path }));
            if (avatarProfiles.length > 0) {
              const urls = await resolveAvatarUrls(avatarProfiles);
              setQuestionAvatarUrls(urls);
            }
          }
        } catch {
          // leave empty
        }
        setQuestionsLoading(false);
      })();
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, resolveAvatarUrls]);

  /* ---------------------------------------------------------------- */
  /*  Quick search (debounced)                                         */
  /* ---------------------------------------------------------------- */

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setSearchLoading(true);
        const pattern = `%${query.trim()}%`;
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, role, program, avatar_path, skills")
          .or(`full_name.ilike.${pattern},program.ilike.${pattern}`)
          .limit(6);

        const results = data ?? [];
        setSearchResults(results);

        const urls = await resolveAvatarUrls(results);
        setSearchAvatarUrls((prev) => ({ ...prev, ...urls }));

        setShowDropdown(true);
        setSearchLoading(false);
      }, 350);
    },
    [resolveAvatarUrls]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 dark:text-slate-500">Loading...</p>
      </div>
    );
  }

  const displayName = fullName || user?.user_metadata?.full_name || user?.email || "there";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* ---- Hero Banner ---- */}
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-8 py-10 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base max-w-md">
            Here&apos;s what&apos;s happening in your community today.
          </p>

        </div>

        <div className="flex gap-3">
          <Link
            href="/app/feed/new"
            className="inline-flex items-center gap-2 rounded-lg bg-white text-slate-900 px-5 py-2.5 text-sm font-medium hover:bg-gray-100 transition dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <span className="text-lg leading-none">+</span> Create Post
          </Link>
          <Link
            href="/app/questions"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium hover:bg-white/20 transition"
          >
            <span className="text-lg leading-none">?</span> Ask Question
          </Link>
        </div>
      </section>

      {/* ---- Profile Completion Banner ---- */}
      {profileIncomplete && (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:bg-slate-950 dark:border-slate-700">
          <div className="flex">
            {/* Navy accent stripe */}
            <div className="w-1.5 bg-slate-800 shrink-0 dark:bg-slate-400" />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-800 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Finish setting up your profile
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  A complete profile helps others find and connect with you.
                </p>

                {missingFields.length > 0 && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    {missingFields.map((field) => (
                      <li key={field} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {field}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Link
                href="/app/me"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-700 transition whitespace-nowrap shrink-0"
              >
                Complete Profile
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---- Quick Search ---- */}
      <div ref={searchRef} className="relative max-w-md">
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (searchQuery.trim() && searchResults.length > 0) setShowDropdown(true);
          }}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-400/30"
        />
        {showDropdown && searchQuery.trim() && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto dark:bg-slate-950 dark:border-slate-700">
            {searchLoading ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">No matching members.</p>
            ) : (
              <ul>
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push(`/app/profile/${result.id}`);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 dark:hover:bg-slate-800"
                    >
                      <Avatar
                        fullName={result.full_name || "?"}
                        avatarUrl={searchAvatarUrls[result.id]}
                        size="sm"
                      />
                      <span className="font-medium text-sm dark:text-slate-100">
                        {result.full_name || "Unnamed Member"}
                      </span>
                      {result.role && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded dark:bg-slate-700 dark:text-slate-300">
                          {result.role}
                        </span>
                      )}
                      {result.program && (
                        <span className="text-xs text-gray-500 dark:text-slate-400">{result.program}</span>
                      )}
                      {result.skills && result.skills.length > 0 && (
                        <>
                          <span
                            title={result.skills[0]}
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700 max-w-[140px] truncate whitespace-nowrap overflow-hidden dark:border-slate-600 dark:text-slate-300"
                          >
                            {result.skills[0]}
                          </span>
                          {result.skills.length > 1 && (
                            <span className="text-xs text-gray-400 whitespace-nowrap dark:text-slate-500">
                              +{result.skills.length - 1}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/app/directory?query=${encodeURIComponent(searchQuery.trim())}`}
              className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 border-t text-center dark:text-blue-400 dark:hover:bg-slate-800 dark:border-slate-700"
            >
              See all results
            </Link>
          </div>
        )}
      </div>

      {/* ---- Stat Cards ---- */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Unread Messages"
          value={unreadMessagesCount}
          icon={<MailIcon />}
          href="/app/messages"
        />
        <StatCard
          label="New Q&A Activity"
          value={qaActivityCount}
          icon={<QaIcon />}
          href="/app/questions"
        />
        <StatCard
          label="Online Members"
          value={onlineMembersCount}
          icon={<WifiIcon />}
        />
        <StatCard
          label="Community"
          value={0}
          icon={<UsersIcon />}
          href="/app/directory"
          linkLabel="Browse Directory"
        />
      </section>

      {/* ---- Two-Column Preview ---- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Posts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-slate-100">
              <span className="w-1 h-5 bg-blue-600 rounded-full inline-block" />
              Recent Posts
            </h2>
            <Link href="/app/feed" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              View all
            </Link>
          </div>

          {postsLoading ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">Loading posts...</p>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-400">
              No posts yet. Be the first to share something!
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/app/feed#post-${post.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow dark:bg-slate-950 dark:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      fullName={post.author_name}
                      avatarUrl={postAvatarUrls[post.author_id]}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900 dark:text-slate-100">
                          {post.author_name}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2 dark:text-slate-500">
                          {timeAgo(post.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2 dark:text-slate-400">
                        {truncate(post.content, 120)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Questions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-slate-100">
              <span className="w-1 h-5 bg-amber-500 rounded-full inline-block" />
              Recent Questions
            </h2>
            <Link href="/app/questions" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              View all
            </Link>
          </div>

          {questionsLoading ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">Loading questions...</p>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-400">
              No questions yet. Ask the community something!
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <Link
                  key={q.id}
                  href={`/app/questions/${q.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow dark:bg-slate-950 dark:border-slate-700"
                >
                  <h3 className="font-medium text-sm text-gray-900 dark:text-slate-100">
                    {truncate(q.title, 80)}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Avatar
                        fullName={q.author_name}
                        avatarUrl={questionAvatarUrls[q.author_id]}
                        size="sm"
                      />
                      <span>{q.author_name}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(q.created_at)}</span>
                    </div>
                    <span className="text-gray-400 dark:text-slate-500">
                      {q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
