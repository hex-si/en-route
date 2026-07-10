"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users, FileText, Download, LogOut, Shield, Megaphone, Calendar, MapPin } from "lucide-react";

const navItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/requests", label: "Requests", icon: FileText },
  { href: "/admin/areas", label: "Areas", icon: MapPin },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/updates", label: "Updates", icon: Calendar },
  { href: "/admin/export", label: "Export", icon: Download },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    const isAdmin = localStorage.getItem("en-route-admin");
    if (!isAdmin) { router.push("/admin/login"); return; }
    setAuthenticated(true);
    setChecking(false);
  }, [pathname, router]);

  const handleLogout = () => {
    document.cookie = "en-route-admin=; path=/admin; max-age=0";
    localStorage.removeItem("en-route-admin");
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") return <>{children}</>;

  if (checking) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Desktop Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10 hidden sm:block">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[var(--primary)]" />
            <span className="font-bold text-sm">En-Route Admin</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${active ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium" : "text-[var(--text-secondary)] hover:bg-gray-100"}`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout} className="ml-2 p-2 text-[var(--text-secondary)] hover:bg-gray-100 rounded-lg transition">
              <LogOut size={16} />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10 sm:hidden">
        <div className="px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[var(--primary)]" />
            <span className="font-bold text-sm">Admin</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-[var(--text-secondary)] hover:bg-gray-100 rounded-lg transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 pb-20 sm:pb-6">{children}</main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-10">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition ${active ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
