"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { Icons } from "./Icons";

export default function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.full_name);
        }
      }
    }

    checkUser();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    router.push("/");
  };

  const dashboardLink = userRole === "provider" ? "/dashboard/fachman" : userRole === "admin" ? "/admin" : "/dashboard";

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${
      scrolled 
        ? "bg-white/95 backdrop-blur-md shadow-2xl shadow-cyan-500/10 py-2" 
        : "bg-transparent py-4"
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo - VĚTŠÍ */}
          <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-300">
            <Image 
              src="/logo.png" 
              alt="Fachmani" 
              width={180} 
              height={60}
              className="h-14 md:h-16 w-auto drop-shadow-lg"
              priority
            />
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center space-x-1">
            <Link 
              href="/poptavky" 
              className="group px-4 py-2 text-gray-700 hover:text-cyan-500 rounded-xl transition-all font-semibold relative overflow-hidden"
            >
              <span className="relative z-10">Poptávky</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-cyan-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></span>
            </Link>
            <Link 
              href="/fachmani" 
              className="group px-4 py-2 text-gray-700 hover:text-cyan-500 rounded-xl transition-all font-semibold relative overflow-hidden"
            >
              <span className="relative z-10">Fachmani</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-cyan-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></span>
            </Link>
            <Link 
              href="/kategorie" 
              className="group px-4 py-2 text-gray-700 hover:text-cyan-500 rounded-xl transition-all font-semibold relative overflow-hidden"
            >
              <span className="relative z-10">Kategorie</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-cyan-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></span>
            </Link>
            <Link 
              href="/cenik" 
              className="group px-4 py-2 text-gray-700 hover:text-cyan-500 rounded-xl transition-all font-semibold relative overflow-hidden"
            >
              <span className="relative z-10">Ceník</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-cyan-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></span>
            </Link>
            <Link 
              href="/jak-to-funguje" 
              className="group px-4 py-2 text-gray-700 hover:text-cyan-500 rounded-xl transition-all font-semibold relative overflow-hidden"
            >
              <span className="relative z-10">Jak to funguje</span>
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-cyan-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></span>
            </Link>
            
            {isLoggedIn ? (
              <>
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-3"></div>
                <NotificationBell />
                <Link 
                  href="/zpravy" 
                  className="p-2.5 text-gray-600 hover:text-cyan-500 hover:bg-cyan-50 rounded-xl transition-all"
                >
                  {Icons.chat}
                </Link>
                {userRole === "provider" && (
                  <Link 
                    href="/dashboard/fachman/profil" 
                    className="px-4 py-2 text-gray-700 hover:text-cyan-500 font-semibold transition-all"
                  >
                    Můj profil
                  </Link>
                )}
                <Link 
                  href={dashboardLink} 
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-all font-bold"
                >
                  {userName || "Dashboard"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-semibold"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-3"></div>
                <Link 
                  href="/auth/login" 
                  className="px-5 py-2.5 text-gray-700 hover:text-cyan-500 font-bold transition-all"
                >
                  Přihlásit se
                </Link>
                <Link 
                  href="/auth/register" 
                  className="relative group ml-2"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-7 py-3 rounded-2xl font-bold hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300">
                    Registrace
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-3 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl transition-all"
          >
            {isOpen ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-6 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl shadow-cyan-500/10 p-6 border border-gray-100">
              <div className="flex flex-col space-y-2">
                <Link 
                  href="/poptavky" 
                  className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Poptávky
                </Link>
                <Link 
                  href="/fachmani" 
                  className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Fachmani
                </Link>
                <Link 
                  href="/kategorie" 
                  className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Kategorie
                </Link>
                <Link 
                  href="/cenik" 
                  className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Ceník
                </Link>
                <Link 
                  href="/jak-to-funguje" 
                  className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  Jak to funguje
                </Link>
                
                {isLoggedIn ? (
                  <>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-3"></div>
                    <Link 
                      href="/zpravy" 
                      className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all flex items-center gap-3"
                      onClick={() => setIsOpen(false)}
                    >
                      {Icons.chat} Zprávy
                    </Link>
                    {userRole === "provider" && (
                      <Link 
                        href="/dashboard/fachman/profil" 
                        className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                        onClick={() => setIsOpen(false)}
                      >
                        Můj profil
                      </Link>
                    )}
                    <Link 
                      href={dashboardLink} 
                      className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      {userName || "Dashboard"}
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="px-5 py-4 text-left text-red-500 hover:bg-red-50 rounded-2xl font-bold text-lg transition-all"
                    >
                      Odhlásit se
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-3"></div>
                    <Link 
                      href="/auth/login" 
                      className="px-5 py-4 text-gray-700 hover:text-cyan-500 hover:bg-cyan-50 rounded-2xl font-bold text-lg transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      Přihlásit se
                    </Link>
                    <Link 
                      href="/auth/register" 
                      className="mt-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-4 rounded-2xl text-center font-bold text-lg shadow-lg shadow-cyan-500/30"
                      onClick={() => setIsOpen(false)}
                    >
                      Registrace
                    </Link>
                    <Link 
                      href="/auth/register?role=provider" 
                      className="mt-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-6 py-4 rounded-2xl text-center font-bold text-lg"
                      onClick={() => setIsOpen(false)}
                    >
                      Jsem fachman
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}