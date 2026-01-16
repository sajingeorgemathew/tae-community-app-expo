"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
}

export default function DirectoryPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role")
        .limit(50);

      if (error) {
        console.error("Error fetching profiles:", error.message);
      } else {
        setProfiles(data || []);
      }
      setLoading(false);
    }

    fetchProfiles();
  }, []);

  const filteredProfiles = profiles.filter((profile) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const nameMatch = profile.full_name?.toLowerCase().includes(query);
    const programMatch = profile.program?.toLowerCase().includes(query);
    const yearMatch = profile.grad_year?.toString().includes(query);

    return nameMatch || programMatch || yearMatch;
  });

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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {profile.full_name || "Unnamed Member"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {[profile.program, profile.grad_year]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </p>
                  </div>
                  {profile.role && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {profile.role}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
