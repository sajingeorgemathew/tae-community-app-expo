"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

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

function FacultyContent() {
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutorCourses, setTutorCourses] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagingProfileId, setMessagingProfileId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const noTutorsAtAll = tutors.length === 0;
  const noFilterResults = !noTutorsAtAll && filteredTutors.length === 0;

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Faculty</h1>

      {!noTutorsAtAll && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, headline, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          />
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {noTutorsAtAll ? (
        <p className="text-gray-500">No tutors listed yet.</p>
      ) : noFilterResults ? (
        <p className="text-gray-500">No tutors match your filters.</p>
      ) : (
        <ul className="space-y-3">
          {filteredTutors.map((tutor) => (
            <li key={tutor.id}>
              <Link
                href={`/app/profile/${tutor.id}`}
                className="block border rounded p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    fullName={tutor.full_name || "?"}
                    avatarUrl={avatarUrls[tutor.id]}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {tutor.full_name || "Unnamed Tutor"}
                    </p>
                    {tutor.headline && (
                      <p className="text-sm text-gray-600 truncate">{tutor.headline}</p>
                    )}
                    {tutor.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tutor.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {(tutorCourses[tutor.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tutorCourses[tutor.id].map((course) => (
                          <span
                            key={course.id}
                            className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700"
                          >
                            {course.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {currentUserId && currentUserId !== tutor.id && (
                      <button
                        onClick={(e) => handleMessage(tutor.id, e)}
                        disabled={messagingProfileId === tutor.id}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {messagingProfileId === tutor.id ? "..." : "Message"}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function FacultyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </main>
      }
    >
      <FacultyContent />
    </Suspense>
  );
}
