"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }

      setLoading(false);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
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
        <button
          onClick={handleLogout}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Log Out
        </button>
      </div>

      <p className="mb-6">
        Welcome, {user?.user_metadata?.full_name || user?.email}!
      </p>

      {/* Navigation Links */}
      <div className="flex gap-4 flex-wrap">
        <Link
          href="/app/feed"
          className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          Feed
        </Link>
        <Link
          href="/app/directory"
          className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          Open Directory
        </Link>
        <Link
          href="/app/me"
          className="inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          My Profile
        </Link>
        {isAdmin && (
          <Link
            href="/app/admin"
            className="inline-block bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition"
          >
            Admin Dashboard
          </Link>
        )}
      </div>
    </main>
  );
}
