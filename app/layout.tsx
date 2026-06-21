import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CookieBanner from "./components/CookieBanner";
import ChatWidget from "./components/ChatWidget";
import ChatHeads from "./components/messenger/ChatHeads";
import NativePushRegistrar from "./components/NativePushRegistrar";
import MetaPixel from "./components/MetaPixel";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06b6d4",
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://fachmani.org").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Fachmani - Najdi ověřeného fachmana",
  description: "Platforma pro propojení zákazníků s ověřenými poskytovateli služeb",
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <ChatHeads />
        {/* Fachmánek — plovoucí AI popup (skrytý na iOS + když je vypnutý v adminu). */}
        <ChatWidget />
        <CookieBanner />
        <NativePushRegistrar />
        <MetaPixel />
      </body>
    </html>
  );
}