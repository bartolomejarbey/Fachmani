"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Nesprávný email nebo heslo.");
      setLoading(false);
      return;
    }

    // Detect role server-side (bypasses RLS)
    const roleRes = await fetch("/api/auth/me");
    const { role } = await roleRes.json();

    if (role !== "client") {
      toast.error("Tento účet není klientský. Přihlaste se na stránce pro poradce.");
      await supabase.auth.signOut();
      setLoading(false);
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    window.location.href = "/portal";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-4">
      {/* Glow blobs */}
      <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/[.08] blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/[.06] blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/20">
            <Lock className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Klientský portál
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Přihlaste se do svého portálu
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="portal-email" className="block text-sm font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="portal-email"
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="portal-password" className="block text-sm font-medium text-gray-400 mb-1.5">
                Heslo
              </label>
              <input
                id="portal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Přihlásit se
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Jste poradce?{" "}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Přihlaste se zde
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-700">
          &copy; 2026 FinAdvisor
        </p>
      </div>
    </div>
  );
}
