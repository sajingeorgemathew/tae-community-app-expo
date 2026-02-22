"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/src/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Ensure profile exists
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: data.user.id, full_name: fullName }, { onConflict: "id" });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      router.push("/app");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg dark:shadow-black/30 border-t-4 border-[#1e293b] dark:border-slate-500 p-8">
        <div className="flex justify-center mb-6">
          <Image
            src="/tae-logo.jpg"
            alt="Toronto Academy of Excellence"
            width={120}
            height={120}
            className="rounded-lg"
            priority
          />
        </div>
        <h1 className="text-2xl font-semibold mb-6 text-center text-[#1e293b] dark:text-slate-100">Sign Up</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium mb-1 dark:text-slate-200">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1 dark:text-slate-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 dark:text-slate-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b] dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400"
            />
          </div>
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e293b] text-white py-2 rounded-lg hover:bg-[#334155] disabled:opacity-50 transition-colors dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center dark:text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1e293b] dark:text-slate-100 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
