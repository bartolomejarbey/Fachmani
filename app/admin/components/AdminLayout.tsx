"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  admin_role: "master_admin" | "admin" | "sales";
  avatar_url?: string;
};

type MenuItem = {
  name: string;
  href: string;
  icon: string;
  roles: string[];
  badge?: number;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    activeRequests: 0,
    newToday: 0,
  });

  const menuItems: MenuItem[] = [
    { name: "Dashboard", href: "/admin", icon: "📊", roles: ["master_admin", "admin", "sales"] },
    { name: "Uživatelé", href: "/admin/uzivatele", icon: "👥", roles: ["master_admin", "admin"] },
    { name: "Fachmani", href: "/admin/fachmani", icon: "👷", roles: ["master_admin", "admin", "sales"] },
    { name: "Fiktivní fachmani", href: "/admin/seed-fachmani", icon: "🎭", roles: ["master_admin", "admin", "sales"] },
    { name: "Poptávky", href: "/admin/poptavky", icon: "📋", roles: ["master_admin", "admin", "sales"] },
    { name: "Kategorie", href: "/admin/kategorie", icon: "📁", roles: ["master_admin", "admin"] },
    { name: "Topování & Promo", href: "/admin/promo", icon: "🚀", roles: ["master_admin", "admin", "sales"] },
    { name: "Transakce", href: "/admin/transakce", icon: "💳", roles: ["master_admin", "admin"] },
    { name: "Faktury", href: "/admin/faktury", icon: "📄", roles: ["master_admin", "admin"] },
    { name: "Tým", href: "/admin/tym", icon: "🏢", roles: ["master_admin"] },
    { name: "Activity Log", href: "/admin/activity", icon: "📜", roles: ["master_admin"] },
    { name: "Nastavení", href: "/admin/nastaveni", icon: "⚙️", roles: ["master_admin"] },
  ];

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, admin_role, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile?.admin_role) {
        router.push("/admin/login");
        return;
      }

      setAdmin(profile as AdminProfile);

      // Načteme statistiky pro badges
      const [
        { count: pendingVerifications },
        { count: activeRequests },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true })
          .eq("role", "provider").eq("is_verified", false),
        supabase.from("requests").select("*", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      setStats({
        pendingVerifications: pendingVerifications || 0,
        activeRequests: activeRequests || 0,
        newToday: 0,
      });

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    if (admin) {
      await supabase.from("admin_activity_log").insert({
        admin_id: admin.id,
        action: "logout",
      });
    }
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "master_admin":
        return { label: "Master Admin", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "admin":
        return { label: "Admin", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      case "sales":
        return { label: "Obchodník", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      default:
        return { label: "Unknown", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
    }
  };

  const filteredMenu = menuItems.filter(item => 
    admin && item.roles.includes(admin.admin_role)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Načítám administraci...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  const roleBadge = getRoleBadge(admin.admin_role);

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-72' : 'w-20'} bg-slate-800/50 border-r border-white/5 transition-all duration-300`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              F
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg">Fachmani</h1>
                <p className="text-slate-500 text-xs">Admin Panel</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.name === "Uživatelé" && stats.pendingVerifications > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {stats.pendingVerifications}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-white/5 text-slate-500 hover:text-white transition-colors"
        >
          {sidebarOpen ? "◀ Sbalit" : "▶"}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-800/95 backdrop-blur border-b border-white/5 z-50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-white font-bold">Fachmani Admin</h1>
          <div className="w-10"></div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="p-4 space-y-1 bg-slate-800 border-t border-white/5">
            {filteredMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                  pathname === item.href
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:pt-0 pt-16">
        {/* Top Header */}
        <header className="bg-slate-800/30 border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">
                {filteredMenu.find(m => m.href === pathname)?.name || "Dashboard"}
              </h2>
              <p className="text-slate-500 text-sm">
                {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {stats.pendingVerifications > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {stats.pendingVerifications}
                  </span>
                )}
              </button>

              {/* Profile */}
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-white font-medium text-sm">{admin.full_name}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold cursor-pointer">
                    {admin.full_name.charAt(0)}
                  </div>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-white font-medium text-sm">{admin.full_name}</p>
                      <p className="text-slate-500 text-xs">{admin.email}</p>
                    </div>
                    <div className="p-2">
                      <Link href="/" className="block px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-sm">
                        🌐 Zpět na web
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm"
                      >
                        🚪 Odhlásit se
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/5 text-center text-slate-500 text-sm">
          Fachmani Admin v1.0 • © 2025
        </footer>
      </div>
    </div>
  );
}
