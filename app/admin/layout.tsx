"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users, FileText, Download, LogOut, Shield, Megaphone, Calendar, MapPin, LayoutDashboard, Menu, X, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") { setChecking(false); return; }
    const isAdmin = localStorage.getItem("en-route-admin");
    if (!isAdmin) { router.push("/admin/login"); return; }
    setAuthenticated(true);
    setChecking(false);
  }, [pathname, router]);

  const handleLogout = () => {
    document.cookie = "en-route-admin=; path=/; max-age=0";
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

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[var(--border)] fixed inset-y-0 left-0 z-20">
        <div className="px-5 h-16 flex items-center gap-3 border-b border-[var(--border)]">
          <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">En-Route</p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text)]"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.href === "/admin/requests" && (
                  <span className="ml-auto bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 transition w-full"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[var(--border)]">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-[var(--text-secondary)] hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-bold text-sm">Admin</span>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-[var(--text-secondary)] hover:bg-gray-100 rounded-lg">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <div className="px-5 h-16 flex items-center justify-between border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm">En-Route</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Admin Panel</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-[var(--text-secondary)] hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--text-secondary)] hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
