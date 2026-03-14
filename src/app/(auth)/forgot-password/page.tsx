"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Nepodařilo se odeslat email.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Něco se pokazilo. Zkuste to znovu.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Zapomenuté heslo</h1>
            <p className="text-sm text-slate-500 mt-1">
              Zadejte svůj email a pošleme vám odkaz pro obnovení hesla
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Email odeslán
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Pokud účet s emailem <strong>{email}</strong> existuje, obdržíte
                odkaz pro obnovení hesla.
              </p>
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Zpět na přihlášení
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Odeslat odkaz
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Zpět na přihlášení
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
