"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

interface Tutor {
  id: string;
  full_name: string | null;
  headline: string | null;
  skills: string[];
  program: string | null;
  avatar_path: string | null;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

/* ──────────────────────────── icons ─────────────────── */
function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
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

function GraduationCapIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
    </svg>
  );
}

/* ──────────────────────────── main content ──────────── */
function FacultyContent() {
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutorCourses, setTutorCourses] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagingProfileId, setMessagingProfileId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());
  const { resolveAvatarUrls } = useAvatarUrls();

  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }

      // Fetch tutors
      const { data: tutorData, error: tutorError } = await supabase
        .from("profiles")
        .select("id, full_name, headline, skills, program, avatar_path")
        .eq("role", "tutor")
        .eq("is_listed_as_tutor", true)
        .limit(50);

      if (tutorError) {
        console.error("Error fetching tutors:", tutorError.message);
        setLoading(false);
        return;
      }

      const rows: Tutor[] = (tutorData || []).map((d) => ({
        ...d,
        skills: d.skills ?? [],
      }));
      setTutors(rows);

      const urls = await resolveAvatarUrls(rows);
      setAvatarUrls(urls);

      // Fetch presence for these tutors
      const tutorIds2 = rows.map((t) => t.id);
      if (tutorIds2.length > 0) {
        const { data: presenceData } = await supabase
          .from("presence")
          .select("user_id, last_seen_at")
          .in("user_id", tutorIds2);

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
      }

      // Fetch active courses for the filter dropdown
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, code, title")
        .eq("is_active", true)
        .order("code");

      if (courseData) {
        setCourses(courseData);
      }

      // Fetch tutor course assignments for these tutors
      const tutorIds = rows.map((t) => t.id);
      if (tutorIds.length > 0) {
        const { data: assignmentData } = await supabase
          .from("tutor_course_assignments")
          .select("tutor_id, course_id, courses(id, code, title)")
          .in("tutor_id", tutorIds);

        if (assignmentData) {
          const map: Record<string, Course[]> = {};
          for (const a of assignmentData as any[]) {
            if (!a.courses) continue;
            const course = a.courses as Course;
            if (!map[a.tutor_id]) map[a.tutor_id] = [];
            map[a.tutor_id].push(course);
          }
          setTutorCourses(map);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredTutors = useMemo(() => {
    let result = tutors;

    if (selectedCourseId) {
      result = result.filter((t) =>
        (tutorCourses[t.id] || []).some((c) => c.id === selectedCourseId)
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => {
        const name = (t.full_name || "").toLowerCase();
        const headline = (t.headline || "").toLowerCase();
        const program = (t.program || "").toLowerCase();
        const skills = t.skills.map((s) => s.toLowerCase()).join(" ");
        return (
          name.includes(q) ||
          headline.includes(q) ||
          program.includes(q) ||
          skills.includes(q)
        );
      });
    }

    return result;
  }, [tutors, tutorCourses, selectedCourseId, search]);

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

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <main className="min-h-screen p-6 md:p-10 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          {/* skeleton header */}
          <div className="mb-8">
            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
          {/* skeleton filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="h-11 flex-1 max-w-md bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-11 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          </div>
          {/* skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 animate-pulse flex flex-col items-center"
              >
                <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-700 mb-4" />
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 w-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full mb-3" />
                <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700/60 rounded mb-2" />
                <div className="flex gap-2 mb-4 mt-2">
                  <div className="h-5 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
                  <div className="h-5 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
                  <div className="h-5 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
                </div>
                <div className="w-full border-t border-slate-100 dark:border-slate-700 pt-4 mt-auto flex gap-2">
                  <div className="h-9 flex-1 bg-slate-100 dark:bg-slate-700/60 rounded-lg" />
                  <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const noTutorsAtAll = tutors.length === 0;
  const noFilterResults = !noTutorsAtAll && filteredTutors.length === 0;

  /* ── main render ── */
  return (
    <main className="min-h-screen p-6 md:p-10 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* ── header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Faculty</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Meet our tutors — here to guide you through your learning journey.
          </p>
        </div>

        {/* ── filters ── */}
        {!noTutorsAtAll && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, headline, skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-9 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1e293b] dark:focus:border-slate-400 focus:ring-1 focus:ring-[#1e293b]/20 dark:focus:ring-slate-400/20 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {courses.length > 0 && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1e293b] dark:focus:border-slate-400 focus:ring-1 focus:ring-[#1e293b]/20 dark:focus:ring-slate-400/20 transition-colors"
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── empty / no-results states ── */}
        {noTutorsAtAll ? (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <GraduationCapIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">No tutors listed yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Faculty listings will appear here once tutors are available.
            </p>
          </div>
        ) : noFilterResults ? (
          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <SearchIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">No tutors match your filters</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your search or course filter.</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedCourseId("");
              }}
              className="mt-4 text-sm text-[#1e293b] dark:text-slate-300 font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* ── tutor cards grid ── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredTutors.map((tutor) => (
              <div
                key={tutor.id}
                className="group relative rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg dark:shadow-slate-900/50 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200 flex flex-col"
              >
                {/* tutor badge */}
                <span className="absolute top-4 right-4 text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
                  Tutor
                </span>

                {/* card body – clickable area → profile */}
                <Link
                  href={`/app/profile/${tutor.id}`}
                  className="flex-1 p-6 pb-4 flex flex-col items-center text-center"
                >
                  {/* large avatar with presence dot */}
                  <div className="relative mb-4">
                    <Avatar
                      fullName={tutor.full_name || "?"}
                      avatarUrl={avatarUrls[tutor.id]}
                      size="xl"
                    />
                    {onlineSet.has(tutor.id) && (
                      <span
                        className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-[2.5px] border-white dark:border-slate-800 rounded-full ring-1 ring-emerald-400/50"
                        title="Online"
                      />
                    )}
                  </div>

                  {/* name */}
                  <h3 className="text-lg font-semibold text-[#1e293b] dark:text-white leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {tutor.full_name || "Unnamed Tutor"}
                  </h3>

                  {/* headline */}
                  {tutor.headline ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tutor.headline}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic mt-1">
                      Tutor
                    </p>
                  )}

                  {/* skills chips */}
                  {tutor.skills.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                      {tutor.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="inline-block text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {tutor.skills.length > 5 && (
                        <span className="inline-block text-[11px] text-slate-400 px-1 py-0.5">
                          +{tutor.skills.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* course chips */}
                  {(tutorCourses[tutor.id] || []).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                      {tutorCourses[tutor.id].map((course) => (
                        <span
                          key={course.id}
                          className="inline-block text-[11px] font-medium text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2.5 py-0.5 rounded-full"
                        >
                          {course.code}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                {/* CTA row */}
                <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3.5 flex flex-col sm:flex-row items-center gap-2 mt-auto">
                  <Link
                    href={`/app/profile/${tutor.id}`}
                    className="flex-1 text-center text-sm font-medium text-[#1e293b] dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    View Profile
                  </Link>
                  {currentUserId && currentUserId !== tutor.id && (
                    <button
                      onClick={(e) => handleMessage(tutor.id, e)}
                      disabled={messagingProfileId === tutor.id}
                      className="flex-1 text-center text-sm font-medium text-white bg-[#1e293b] dark:bg-slate-200 dark:text-slate-900 rounded-lg px-3 py-2 hover:bg-[#334155] dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {messagingProfileId === tutor.id ? (
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
        {filteredTutors.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-6">
            Showing <span className="font-medium text-slate-600 dark:text-slate-300">{filteredTutors.length}</span>{" "}
            {filteredTutors.length === 1 ? "tutor" : "tutors"}
            {search && (
              <>
                {" "}matching &ldquo;<span className="text-slate-600 dark:text-slate-300">{search}</span>&rdquo;
              </>
            )}
          </p>
        )}
      </div>
    </main>
  );
}

export default function FacultyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center dark:bg-slate-900">
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Loading faculty…</span>
          </div>
        </main>
      }
    >
      <FacultyContent />
    </Suspense>
  );
}
