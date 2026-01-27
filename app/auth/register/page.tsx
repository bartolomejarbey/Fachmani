"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [isProvider, setIsProvider] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check URL params on client side only
    const params = new URLSearchParams(window.location.search);
    if (params.get("role") === "provider") {
      setIsProvider(true);
      setRole("provider");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ role: role, full_name: fullName })
        .eq("id", data.user.id);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Registrace úspěšná!</h2>
          <p className="text-gray-600 mb-6">
            Poslali jsme vám email s potvrzovacím odkazem. Klikněte na něj pro aktivaci účtu.
          </p>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Přejít na přihlášení
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Registrace</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jméno a příjmení
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heslo
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Registruji se jako
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="customer"
                  checked={role === "customer"}
                  onChange={(e) => setRole(e.target.value)}
                  className="mr-2"
                />
                Hledám služby
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="provider"
                  checked={role === "provider"}
                  onChange={(e) => setRole(e.target.value)}
                  className="mr-2"
                />
                Jsem fachman
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Registruji..." : "Zaregistrovat se"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Už máte účet?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Přihlaste se
          </Link>
        </p>
      </div>
    </div>
  );
}