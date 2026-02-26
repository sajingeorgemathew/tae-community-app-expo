"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/app");
      } else {
        router.push("/login");
      }
    }
    checkSession();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </main>
  );
}
