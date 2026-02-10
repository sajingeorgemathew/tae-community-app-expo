"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

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

function DirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messagingProfileId, setMessagingProfileId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
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

      <h1 className="text-2xl font-semibold mb-6">Member Directory</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, program, or year..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border rounded px-3 py-2"
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <p className="text-gray-500">No members found.</p>
      ) : (
        <ul className="space-y-3">
          {filteredProfiles.map((profile) => (
            <li key={profile.id}>
              <Link
                href={`/app/profile/${profile.id}`}
                className="block border rounded p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    fullName={profile.full_name || "?"}
                    avatarUrl={avatarUrls[profile.id]}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {profile.full_name || "Unnamed Member"}
                    </p>
                    {profile.headline && (
                      <p className="text-sm text-gray-600 truncate">{profile.headline}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {[profile.program, profile.grad_year]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {currentUserId && currentUserId !== profile.id && (
                      <button
                        onClick={(e) => handleMessage(profile.id, e)}
                        disabled={messagingProfileId === profile.id}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {messagingProfileId === profile.id ? "..." : "Message"}
                      </button>
                    )}
                    {profile.role && (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {profile.role}
                      </span>
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

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </main>
      }
    >
      <DirectoryContent />
    </Suspense>
  );
}
