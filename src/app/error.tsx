"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Něco se pokazilo
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Omlouváme se, došlo k neočekávané chybě.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Zkusit znovu
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    </div>
  );
}
