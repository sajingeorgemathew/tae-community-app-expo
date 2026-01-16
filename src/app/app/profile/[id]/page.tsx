"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
}

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-6">
          <Link href="/app/directory" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Directory
          </Link>
        </div>
        <p className="text-gray-500">Profile not found</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app/directory" className="text-blue-600 hover:underline text-sm">
          &larr; Back to Directory
        </Link>
      </div>

      <div className="max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-semibold">
            {profile?.full_name || "Unnamed Member"}
          </h1>
          {profile?.role && (
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
              {profile.role}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Program</p>
            <p>{profile?.program || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Graduation Year</p>
            <p>{profile?.grad_year || "Not specified"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
