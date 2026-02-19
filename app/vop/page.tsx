"use client";

import Link from "next/link";

export default function VOPPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-cyan-600">
            Fachmani
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Všeobecné obchodní podmínky</h1>
        <div className="bg-white rounded-xl shadow-sm p-8">
          <p className="text-gray-600 mb-4">Platné od 1. 1. 2025</p>
          <p className="text-gray-600">Tyto VOP upravují práva a povinnosti uživatelů platformy Fachmani.</p>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-cyan-600 hover:underline">Zpět na hlavní stránku</Link>
        </div>
      </div>
    </div>
  );
}
