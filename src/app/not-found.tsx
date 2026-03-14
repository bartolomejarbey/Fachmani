import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <p className="text-8xl font-bold text-blue-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Stránka nenalezena
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Hledaná stránka neexistuje nebo byla přesunuta.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        <Home className="h-4 w-4" />
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
