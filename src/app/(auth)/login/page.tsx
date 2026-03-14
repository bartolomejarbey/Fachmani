"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRoleRedirectPath } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
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
      if (authError.message.includes("Email not confirmed")) {
        setError("Váš email ještě nebyl ověřen. Zkontrolujte svou emailovou schránku a klikněte na potvrzovací odkaz.");
      } else if (authError.message.includes("Invalid login credentials")) {
        setError("Nesprávný email nebo heslo.");
      } else {
        setError("Při přihlášení došlo k chybě. Zkuste to prosím znovu.");
      }
      setLoading(false);
      return;
    }

    // Detect role server-side (bypasses RLS)
    const roleRes = await fetch("/api/auth/me");
    const { role } = await roleRes.json() as { role: UserRole };
    window.location.href = getRoleRedirectPath(role);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Přihlášení pro poradce</h2>
      <p className="mt-2 text-gray-500">Zadejte své přihlašovací údaje</p>

      {confirmed && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Email byl úspěšně ověřen! Nyní se můžete přihlásit.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="vas@email.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Heslo
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Přihlásit se
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm text-gray-500 transition hover:text-gray-700">
          Zapomněli jste heslo?
        </Link>
      </div>

      {/* Divider */}
      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">nebo</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="mt-4 space-y-2 text-center text-sm">
        <p className="text-gray-500">
          Jste klient?{" "}
          <Link href="/portal/login" className="font-medium text-blue-600 hover:underline">
            Přihlaste se zde
          </Link>
        </p>
        <p className="text-gray-500">
          Nemáte účet?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">
            Zaregistrujte se
          </Link>
        </p>
      </div>
    </div>
  );
}
