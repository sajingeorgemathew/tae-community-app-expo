"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import { useAppMetrics } from "@/src/lib/AppMetricsContext";

interface UserInfo {
  full_name: string;
  role: string;
  avatarUrl: string | null;
}

export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const { getAvatarUrl } = useAvatarUrls();
  const { unreadMessagesCount, qaActivityCount } = useAppMetrics();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadSidebarData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch profile (role, name, avatar)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_path")
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
      badge: unreadMessagesCount,
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
    <nav className="hidden md:flex w-60 flex-shrink-0 flex-col bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800">
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
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            TAE Community
          </span>
        </Link>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 mx-4" />

      {/* Nav links */}
      <div className="flex-1 flex flex-col gap-1 px-3 py-4">
        {links.map((link) => {
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.linkTo ?? link.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 ${
                active
                  ? "bg-slate-900 text-white font-medium dark:bg-slate-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 ${
              isActive("/app/admin")
                ? "bg-slate-900 text-white font-medium dark:bg-slate-700"
                : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
            }`}
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      {/* User block + Logout */}
      <div className="border-t border-slate-200 dark:border-slate-800 mx-4" />
      <div className="px-3 py-4 flex flex-col gap-2">
        {userInfo && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              fullName={userInfo.full_name}
              avatarUrl={userInfo.avatarUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {userInfo.full_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {userInfo.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        >
          {mounted && theme === "dark" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
            </svg>
          )}
          {mounted ? (theme === "dark" ? "Dark" : "Light") : "Light"}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
