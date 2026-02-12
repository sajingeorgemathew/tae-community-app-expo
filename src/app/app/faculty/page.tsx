"use client";

import { Suspense, useEffect, useState } from "react";
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
  avatar_path: string | null;
}

function FacultyContent() {
  const router = useRouter();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagingProfileId, setMessagingProfileId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const { resolveAvatarUrls } = useAvatarUrls();

  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, headline, skills, avatar_path")
        .eq("role", "tutor")
        .eq("is_listed_as_tutor", true)
        .limit(50);

      if (error) {
        console.error("Error fetching tutors:", error.message);
        setLoading(false);
        return;
      }

      const rows: Tutor[] = (data || []).map((d) => ({
        ...d,
        skills: d.skills ?? [],
      }));
      setTutors(rows);

      const urls = await resolveAvatarUrls(rows);
      setAvatarUrls(urls);

      setLoading(false);
    }

    fetchData();
  }, []);

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

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Faculty</h1>

      {tutors.length === 0 ? (
        <p className="text-gray-500">No tutors listed yet.</p>
      ) : (
        <ul className="space-y-3">
          {tutors.map((tutor) => (
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
