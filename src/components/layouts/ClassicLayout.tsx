"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface LayoutNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface ClassicLayoutProps {
  children: React.ReactNode;
  navItems: LayoutNavItem[];
  logoUrl?: string | null;
  logoIconUrl?: string | null;
  appName: string;
  primaryColor: string;
  sidebarBg: string;
  accentColor: string;
  onLogout: () => void;
  bottomContent?: React.ReactNode;
  logoSize?: number;
  logoShape?: "original" | "square" | "circle";
  logoPosition?: "sidebar_top" | "sidebar_center" | "above_nav";
}

/* Group nav items into sections */
const SECTION_MAP: Record<string, string> = {
  // Advisor nav
  "Přehled": "PŘEHLED",
  "Obchodní příležitosti": "PŘEHLED",
  "Klienti": "PŘEHLED",
  "Nové smlouvy": "PŘEHLED",
  "Připomínky": "PŘEHLED",
  "Automatizace": "NÁSTROJE",
  "Šablony": "NÁSTROJE",
  "Kampaně": "NÁSTROJE",
  "Články": "NÁSTROJE",
  "Novinky": "NÁSTROJE",
  "Sezónní připomínky": "NÁSTROJE",
  "Spokojenost": "NÁSTROJE",
  "Import klientů": "NÁSTROJE",
  "Kalendář": "NÁSTROJE",
  "Nastavení": "NASTAVENÍ",
  // Client portal nav
  "Finanční přehled": "PŘEHLED",
  "Smlouvy": "FINANCE",
  "Platby": "FINANCE",
  "Investice": "FINANCE",
  "Finanční plán": "FINANCE",
  "Finanční zdraví": "FINANCE",
  "Kalkulačky": "FINANCE",
  "Scénáře": "FINANCE",
  "Pojistné krytí": "FINANCE",
  "Dokumenty": "DOKUMENTY",
  "Trezor": "DOKUMENTY",
  "Doporučení": "DOKUMENTY",
  "Přání": "DOKUMENTY",
  "Úspěchy": "DOKUMENTY",
  "Životní události": "DOKUMENTY",
  "Rodina": "DOKUMENTY",
  "Evidence": "DOKUMENTY",
  "Oznámení": "DOKUMENTY",
};

function groupNavItems(items: LayoutNavItem[]) {
  const sectionMap = new Map<string, LayoutNavItem[]>();
  const sectionOrder: string[] = [];

  items.forEach((item) => {
    const section = SECTION_MAP[item.label] || "OSTATNÍ";
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
      sectionOrder.push(section);
    }
    sectionMap.get(section)!.push(item);
  });

  return sectionOrder.map((label) => ({ label, items: sectionMap.get(label)! }));
}

export function ClassicLayout({
  children,
  navItems,
  logoUrl,
  appName,
  primaryColor,
  sidebarBg,
  accentColor,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
  logoPosition = "sidebar_top",
}: ClassicLayoutProps) {
  console.log("[ClassicLayout] primaryColor:", primaryColor, "accentColor:", accentColor);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoStyle: React.CSSProperties = {
    height: `${Math.min(logoSize, 48)}px`,
    objectFit: logoShape !== "original" ? "cover" : "contain",
    borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0",
    aspectRatio: logoShape !== "original" ? "1/1" : "auto",
  };

  function renderLogo(maxH?: number) {
    const style = maxH ? { ...logoStyle, height: `${Math.min(logoSize, maxH)}px` } : logoStyle;
    return logoUrl ? (
      <img src={logoUrl} alt={appName} style={style} />
    ) : (
      <span className="text-xl font-bold text-gray-900">{appName}</span>
    );
  }

  function isActive(href: string, basePath: string) {
    return href === basePath ? pathname === basePath : pathname.startsWith(href);
  }

  const basePath = navItems[0]?.href || "/";
  const sections = groupNavItems(navItems);

  function renderNav(closeSidebar?: () => void) {
    return sections.map((section) => (
      <div key={section.label}>
        <p className="px-6 mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {section.label}
        </p>
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const active = isActive(item.href, basePath);
            if (active) console.log("[ClassicLayout] ACTIVE item:", item.label, item.href, "pathname:", pathname, "primaryColor:", primaryColor);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 mx-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                style={active ? { backgroundColor: hexToRgba(primaryColor, 0.15), color: primaryColor, borderLeft: `3px solid ${primaryColor}` } : undefined}
              >
                <span style={active ? { color: primaryColor } : { color: "#9ca3af" }}><item.icon className="h-5 w-5" /></span>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    ));
  }

  return (
    <div className="flex h-screen">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-700">
          <Menu className="h-6 w-6" />
        </button>
        {renderLogo(32)}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-[260px] flex-col bg-white border-r border-gray-100">
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
              {renderLogo(40)}
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {renderNav(() => setSidebarOpen(false))}
            </nav>
            {bottomContent && (
              <div className="px-3 pb-2">
                {bottomContent}
              </div>
            )}
            <div className="border-t border-gray-100 p-3">
              <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700">
                <LogOut className="h-5 w-5" />Odhlásit se
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-white border-r border-gray-100">
        {logoPosition === "sidebar_top" && (
          <div className="flex h-16 items-center px-6 border-b border-gray-100">
            {renderLogo()}
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-2">
          {logoPosition === "above_nav" && (
            <div className="px-6 pb-4 pt-2">
              {renderLogo()}
            </div>
          )}
          {renderNav()}
        </nav>
        {logoPosition === "sidebar_center" && (
          <div className="flex items-center justify-center px-6 py-4 border-t border-gray-100">
            {renderLogo()}
          </div>
        )}
        {bottomContent && (
          <div className="px-3 pb-2">
            {bottomContent}
          </div>
        )}
        <div className="border-t border-gray-100 p-3">
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700">
            <LogOut className="h-5 w-5" />Odhlásit se
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0" style={{ backgroundColor: 'var(--color-background, #f8fafc)' }}>
        {children}
      </main>
    </div>
  );
}
