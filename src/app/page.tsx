"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export default function Home() {
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    async function test() {
      try {
        const { data } = await supabase.auth.getSession();
        setStatus("Supabase connected ✅ Session read OK.");
      } catch (e) {
        setStatus("Supabase connection failed ❌ Check env keys.");
      }
    }
    test();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">TAE Community App</h1>
      <p className="mt-4">{status}</p>
    </main>
  );
}