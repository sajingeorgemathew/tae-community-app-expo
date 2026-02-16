"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [qaActivityCount, setQaActivityCount] = useState(0);

  useEffect(() => {
    async function loadSidebarData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, created_at")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }

      // Fetch unread messages count
      try {
        const { data: convos } = await supabase.rpc("get_my_conversations");
        if (Array.isArray(convos)) {
          const total = convos.reduce(
            (sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0),
            0
          );
          setUnreadCount(total);
        }
      } catch {
        // silent
      }

      // Fetch Q&A activity badge count
      try {
        const { data: readRow } = await supabase
          .from("qa_activity_reads")
          .select("last_seen_at")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const lastSeen =
          readRow?.last_seen_at ?? profile?.created_at ?? new Date().toISOString();

        const [questionsResult, answersResult] = await Promise.all([
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .gt("created_at", lastSeen),
          supabase
            .from("answers")
            .select("id", { count: "exact", head: true })
            .gt("created_at", lastSeen),
        ]);

        const newQuestions = questionsResult.count ?? 0;
        const newAnswers = answersResult.count ?? 0;
        setQaActivityCount(newQuestions + newAnswers);
      } catch {
        // silent
      }
    }

    loadSidebarData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/app", label: "Dashboard" },
    { href: "/app/me", label: "My Profile" },
    {
      href: "/app/messages",
      label: "Messages",
      badge: unreadCount,
    },
    { href: "/app/feed/new", label: "New Post" },
    { href: "/app/directory", label: "Directory" },
    { href: "/app/faculty", label: "Faculty" },
    {
      href: "/app/questions",
      label: "Questions",
      badge: qaActivityCount,
    },
  ];

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <nav className="hidden md:flex w-56 flex-shrink-0 flex-col space-y-2 p-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`block px-4 py-2 rounded hover:bg-gray-100 text-gray-800 flex items-center justify-between ${
            isActive(link.href) ? "bg-gray-100 font-medium" : ""
          }`}
        >
          {link.label}
          {link.badge != null && link.badge > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {link.badge > 99 ? "99+" : link.badge}
            </span>
          )}
        </Link>
      ))}
      {isAdmin && (
        <Link
          href="/app/admin"
          className={`block px-4 py-2 rounded hover:bg-gray-100 text-red-600 ${
            isActive("/app/admin") ? "bg-gray-100 font-medium" : ""
          }`}
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
  );
}
