import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

// Jednodušší font - rychlejší načítání
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap", // Zobrazí fallback font dokud se nenačte
  preload: true,
  variable: "--font-inter",
});

// Lazy load CookieBanner - není potřeba hned
const CookieBanner = dynamic(() => import("./components/CookieBanner"), {
  ssr: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06b6d4",
};

export const metadata: Metadata = {
  title: "Fachmani - Najdi ověřeného fachmana",
  description: "Platforma pro propojení zákazníků s ověřenými poskytovateli služeb",
  robots: "index, follow",
  openGraph: {
    title: "Fachmani - Najdi ověřeného fachmana",
    description: "Platforma pro propojení zákazníků s ověřenými poskytovateli služeb",
    type: "website",
    locale: "cs_CZ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={inter.variable}>
      <head>
        {/* Preconnect k Supabase */}
        <link rel="preconnect" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}