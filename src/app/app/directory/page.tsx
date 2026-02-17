"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
  avatar_path: string | null;
  headline: string | null;
  skills: string[];
}

/* ──────────────────────────── role badge colour map ─ */
const ROLE_STYLES: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 border border-blue-200",
  tutor: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  member: "bg-slate-100 text-slate-600 border border-slate-200",
};

function roleBadgeClass(role: string | null) {
  if (!role) return "";
  return ROLE_STYLES[role.toLowerCase()] ?? "bg-slate-100 text-slate-600 border border-slate-200";
}

/* ──────────────────────────── search icon ─────────── */
function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
      />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ──────────────────────────── main content ─────────── */
function DirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagingProfileId, setMessagingProfileId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const { resolveAvatarUrls } = useAvatarUrls();

  useEffect(() => {
    async function fetchData() {
      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role, avatar_path, headline, skills")
        .limit(50);

      if (error) {
        console.error("Error fetching profiles:", error.message);
        setLoading(false);
        return;
      }

      const profileRows: Profile[] = (data || []).map((d) => ({
        ...d,
        skills: d.skills ?? [],
      }));
      setProfiles(profileRows);

      // Resolve signed avatar URLs via cached helper
      const urls = await resolveAvatarUrls(profileRows);
      setAvatarUrls(urls);

      // Fetch presence for these profiles
      const ids = profileRows.map((p) => p.id);
      const { data: presenceData } = await supabase
        .from("presence")
        .select("user_id, last_seen_at")
        .in("user_id", ids);

      if (presenceData) {
        const now = Date.now();
        const online = new Set<string>();
        for (const row of presenceData) {
          if (now - new Date(row.last_seen_at).getTime() <= ONLINE_THRESHOLD_MS) {
            online.add(row.user_id);
          }
        }
        setOnlineSet(online);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const nameMatch = profile.full_name?.toLowerCase().includes(query);
    const programMatch = profile.program?.toLowerCase().includes(query);
    const yearMatch = profile.grad_year?.toString().includes(query);
    const headlineMatch = profile.headline?.toLowerCase().includes(query);
    const skillsMatch = profile.skills?.some((s) => s.toLowerCase().includes(query));

    return nameMatch || programMatch || yearMatch || headlineMatch || skillsMatch;
  });

  async function handleMessage(profileId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || currentUserId === profileId) return;

    setMessagingProfileId(profileId);
    try {
      const { data, error } = await supabase.rpc("create_conversation_1to1", {
        other_user_id: profileId,
      });

      if (error) {
        console.error("Error creating conversation:", error.message);
        alert("Failed to start conversation");
        return;
      }

      router.push(`/app/messages?c=${data}`);
    } finally {
      setMessagingProfileId(null);
    }
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <main className="min-h-screen p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {/* skeleton header */}
          <div className="mb-8">
            <div className="h-8 w-56 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
          </div>
          {/* skeleton search */}
          <div className="h-11 w-full max-w-md bg-slate-100 rounded-xl animate-pulse mb-8" />
          {/* skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-slate-200 rounded mb-1.5" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                <div className="h-3 w-3/4 bg-slate-50 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                  <div className="h-8 w-24 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  /* ── main render ── */
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* ── header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Member Directory</h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect with {filteredProfiles.length === profiles.length
                ? `${profiles.length} active members`
                : `${filteredProfiles.length} of ${profiles.length} members`}{" "}
              in your community.
            </p>
          </div>

          {/* ── search ── */}
          <div className="relative w-full sm:w-80">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, program, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── empty state ── */}
        {filteredProfiles.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <SearchIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">No members found</p>
            <p className="text-sm text-slate-400">
              {searchQuery
                ? "Try adjusting your search terms."
                : "No members are available at this time."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-sm text-[#1e293b] font-medium hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          /* ── member cards grid ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* card body – clickable area → profile */}
                <Link
                  href={`/app/profile/${profile.id}`}
                  className="flex-1 p-5 pb-3"
                >
                  {/* top row: avatar + name + role */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative shrink-0">
                      <Avatar
                        fullName={profile.full_name || "?"}
                        avatarUrl={avatarUrls[profile.id]}
                        size="md"
                      />
                      {onlineSet.has(profile.id) && (
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"
                          title="Online"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1e293b] truncate leading-tight">
                        {profile.full_name || "Unnamed Member"}
                      </p>
                      {profile.role && (
                        <span
                          className={`inline-block mt-1 text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${roleBadgeClass(profile.role)}`}
                        >
                          {profile.role}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* headline */}
                  {profile.headline ? (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {profile.headline}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic mb-2">
                      No additional details provided.
                    </p>
                  )}

                  {/* program + year */}
                  {(profile.program || profile.grad_year) && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                      </svg>
                      {[profile.program, profile.grad_year].filter(Boolean).join(" · ")}
                    </p>
                  )}

                  {/* skills chips */}
                  {profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {profile.skills.length > 4 && (
                        <span className="inline-block text-[11px] text-slate-400 px-1 py-0.5">
                          +{profile.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </Link>

                {/* CTA row */}
                <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-2">
                  <Link
                    href={`/app/profile/${profile.id}`}
                    className="flex-1 text-center text-sm font-medium text-slate-600 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    View Profile
                  </Link>
                  {currentUserId && currentUserId !== profile.id && (
                    <button
                      onClick={(e) => handleMessage(profile.id, e)}
                      disabled={messagingProfileId === profile.id}
                      className="flex-1 text-center text-sm font-medium text-white bg-[#1e293b] rounded-lg px-3 py-2 hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {messagingProfileId === profile.id ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
                          </svg>
                          Sending…
                        </span>
                      ) : (
                        "Message"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── results count ── */}
        {filteredProfiles.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-6">
            Showing <span className="font-medium text-slate-600">{filteredProfiles.length}</span>{" "}
            {filteredProfiles.length === 1 ? "member" : "members"}
            {searchQuery && (
              <>
                {" "}matching &ldquo;<span className="text-slate-600">{searchQuery}</span>&rdquo;
              </>
            )}
          </p>
        )}
      </div>
    </main>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Loading directory…</span>
          </div>
        </main>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}
