"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";

interface UserInfo {
  full_name: string;
  role: string;
  avatarUrl: string | null;
}

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [qaActivityCount, setQaActivityCount] = useState(0);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { getAvatarUrl } = useAvatarUrls();

  useEffect(() => {
    async function loadSidebarData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch profile (role, name, avatar)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, created_at, full_name, avatar_path")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
      }

      // Build user info for sidebar block
      if (profile) {
        let avatarUrl: string | null = null;
        if (profile.avatar_path) {
          avatarUrl = await getAvatarUrl(profile.avatar_path);
        }
        setUserInfo({
          full_name: profile.full_name ?? "User",
          role: profile.role ?? "member",
          avatarUrl,
        });
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
    { href: "/app", label: "Dashboard", exact: true },
    { href: "/app/me", label: "My Profile", exact: true },
    {
      href: "/app/messages",
      label: "Messages",
      badge: unreadCount,
    },
    { href: "/app/feed", label: "New Post", linkTo: "/app/feed/new" },
    { href: "/app/directory", label: "Directory" },
    { href: "/app/faculty", label: "Faculty" },
    {
      href: "/app/questions",
      label: "Questions",
      badge: qaActivityCount,
    },
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="hidden md:flex w-60 flex-shrink-0 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/app" className="flex items-center gap-3">
          <Image
            src="/tae-logo.jpg"
            alt="TAE Logo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            TAE Community
          </span>
        </Link>
      </div>

      <div className="border-b border-gray-100 mx-4" />

      {/* Nav links */}
      <div className="flex-1 flex flex-col gap-1 px-3 py-4">
        {links.map((link) => {
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.linkTo ?? link.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-slate-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {link.label}
              {link.badge != null && link.badge > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                    active
                      ? "bg-white text-slate-900"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {link.badge > 99 ? "99+" : link.badge}
                </span>
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/app/admin"
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive("/app/admin")
                ? "bg-slate-900 text-white font-medium"
                : "text-red-600 hover:bg-red-50"
            }`}
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      {/* User block + Logout */}
      <div className="border-t border-gray-100 mx-4" />
      <div className="px-3 py-4 flex flex-col gap-2">
        {userInfo && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              fullName={userInfo.full_name}
              avatarUrl={userInfo.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {userInfo.full_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userInfo.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
