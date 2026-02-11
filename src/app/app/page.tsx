"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import type { User } from "@supabase/supabase-js";

interface FeedPreviewPost {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
  has_media: boolean;
}

interface SearchResult {
  id: string;
  full_name: string | null;
  role: string | null;
  program: string | null;
  avatar_path: string | null;
  skills: string[] | null;
}

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<FeedPreviewPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  // Quick search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchAvatarUrls, setSearchAvatarUrls] = useState<Record<string, string>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolveAvatarUrls } = useAvatarUrls();

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // Check admin role + profile completeness
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, avatar_path, headline, skills, program, grad_year")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }

      if (profile) {
        const hasAvatar = !!profile.avatar_path;
        const hasHeadline = !!(profile.headline as string | null)?.trim();
        const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
        const hasProgramYear = !!(profile.program as string | null)?.trim() && !!profile.grad_year;
        if (!(hasAvatar && hasHeadline && hasSkills && hasProgramYear)) {
          setProfileIncomplete(true);
        }
      }

      setLoading(false);

      // Fetch feed preview
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, content, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (postRows) {
        // Get post IDs to check for attachments
        const postIds = postRows.map((r: Record<string, unknown>) => r.id as string);
        let postsWithMedia = new Set<string>();

        if (postIds.length > 0) {
          const { data: attachData } = await supabase
            .from("post_attachments")
            .select("post_id")
            .in("post_id", postIds);

          if (attachData) {
            postsWithMedia = new Set(attachData.map((a: Record<string, unknown>) => a.post_id as string));
          }
        }

        setPosts(
          postRows.map((row: Record<string, unknown>) => {
            const profiles = row.profiles;
            const profile = Array.isArray(profiles) ? profiles[0] : profiles;
            return {
              id: row.id as string,
              content: row.content as string,
              created_at: row.created_at as string,
              author_name: (profile as Record<string, unknown> | null)?.full_name as string ?? "Unknown",
              has_media: postsWithMedia.has(row.id as string),
            };
          })
        );
      }

      setPostsLoading(false);
    }

    checkSession();

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
  }, [router]);

  // Debounced search
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

        // Resolve avatar URLs
        const urls = await resolveAvatarUrls(results);
        setSearchAvatarUrls((prev) => ({ ...prev, ...urls }));

        setShowDropdown(true);
        setSearchLoading(false);
      }, 350);
    },
    []
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "…";
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">TAE Community App</h1>
        <span className="text-sm text-gray-500">
          {user?.user_metadata?.full_name || user?.email}
        </span>
      </div>

      <div className="flex gap-8">
        {/* Left Rail */}
        <nav className="w-56 flex-shrink-0 space-y-2">
          <Link
            href="/app/me"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            My Profile
          </Link>
          <Link
            href="/app/messages"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            Messages
          </Link>
          <Link
            href="/app/feed?new=1"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            New Post
          </Link>
          <Link
            href="/app/directory"
            className="block px-4 py-2 rounded hover:bg-gray-100 text-gray-800"
          >
            Directory
          </Link>
          {isAdmin && (
            <Link
              href="/app/admin"
              className="block px-4 py-2 rounded hover:bg-gray-100 text-red-600"
            >
              Admin Dashboard
            </Link>
          )}
          <hr className="my-3" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 rounded hover:bg-gray-100 text-gray-500 text-sm"
          >
            Log Out
          </button>
        </nav>

        {/* Main Panel */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold mb-4">Welcome</h2>

          {profileIncomplete && (
            <Link
              href="/app/me#completeness"
              className="block mb-4 px-4 py-2.5 rounded border border-blue-200 bg-blue-50 text-sm text-blue-700 hover:bg-blue-100 transition max-w-md"
            >
              Your profile is incomplete.{" "}
              <span className="font-medium underline">Finish your profile &rarr;</span>
            </Link>
          )}

          {/* Quick Search */}
          <div ref={searchRef} className="relative mb-6 max-w-md">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim() && searchResults.length > 0) setShowDropdown(true);
              }}
              className="w-full border rounded px-3 py-2"
            />
            {showDropdown && searchQuery.trim() && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-80 overflow-y-auto">
                {searchLoading ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No matching members.</p>
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
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Avatar
                            fullName={result.full_name || "?"}
                            avatarUrl={searchAvatarUrls[result.id]}
                            size="sm"
                          />
                          <span className="font-medium text-sm">
                            {result.full_name || "Unnamed Member"}
                          </span>
                          {result.role && (
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                              {result.role}
                            </span>
                          )}
                          {result.program && (
                            <span className="text-xs text-gray-500">{result.program}</span>
                          )}
                          {result.skills && result.skills.length > 0 && (
                            <>
                              <span
                                title={result.skills[0]}
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700 max-w-[140px] truncate whitespace-nowrap overflow-hidden"
                              >
                                {result.skills[0]}
                              </span>
                              {result.skills.length > 1 && (
                                <span className="text-xs text-gray-400 whitespace-nowrap">
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
                  className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 border-t text-center"
                >
                  See all results
                </Link>
              </div>
            )}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-700">Recent Posts</h3>
            <Link
              href="/app/feed"
              className="text-blue-600 hover:underline text-sm"
            >
              Go to Feed &rarr;
            </Link>
          </div>

          {postsLoading ? (
            <p className="text-gray-400 text-sm">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="border rounded p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {post.author_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(post.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {truncate(post.content, 150)}
                  </p>
                  {post.has_media && (
                    <span className="text-xs text-gray-400 mt-1 inline-block">
                      📎 Media
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <Link
              href="/app/feed"
              className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
