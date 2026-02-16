"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem("cookie-consent", "all");
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem("cookie-consent", "necessary");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            🍪 Používáme cookies pro správné fungování webu a analýzu návštěvnosti. 
            <Link href="/gdpr" className="underline ml-1 hover:text-blue-300">
              Více informací
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={acceptNecessary}
            className="px-4 py-2 text-sm border border-white rounded-lg hover:bg-gray-800"
          >
            Pouze nezbytné
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 text-sm bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Přijmout vše
          </button>
        </div>
      </div>
    </div>
  );
}