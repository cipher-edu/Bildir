"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import { UserRole } from "@/types";
import {
  LayoutDashboard, Users, Database, RefreshCw,
  LogOut, User, Menu, X, ChevronRight,
} from "lucide-react";

const ADMIN_ROLES = ["admin", "superadmin", "audit_inspector"];
const EDIT_ROLES  = ["admin", "superadmin"];

const NAV_ITEMS = [
  { href: "/admin",            label: "Dashboard",          icon: LayoutDashboard, roles: null },
  { href: "/admin/users",      label: "Foydalanuvchilar",   icon: Users,           roles: ADMIN_ROLES },
  { href: "/admin/catalog",    label: "Katalog",             icon: Database,        roles: EDIT_ROLES },
  { href: "/admin/hemis-sync", label: "HEMIS Sinxronlash",   icon: RefreshCw,       roles: EDIT_ROLES },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, isReady } = useRoleGuard(["staff"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-[#020816] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role      = user.role as UserRole;
  const roleColor = ROLE_COLORS[role] ?? "#6366f1";
  const roleLabel = ROLE_LABELS[role] ?? role;
  const navItems  = NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(role));

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    router.replace("/login");
  }

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
    return (
      <Link href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
          active
            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
            : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
        }`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
      </Link>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-white/[0.06]">
        <p className="text-sm font-bold text-white tracking-tight">hemis-auth</p>
        <p className="text-xs text-slate-500 mt-0.5">Admin panel</p>
      </div>

      {/* User card */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
            style={{ background: `linear-gradient(135deg, ${roleColor}66, ${roleColor}33)`, border: `1px solid ${roleColor}33` }}
          >
            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email}
            </p>
            <p className="text-xs mt-0.5" style={{ color: roleColor }}>{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <Link href="/home"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all border border-transparent">
          <User className="w-4 h-4" />
          Profil sahifasi
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all border border-transparent">
          <LogOut className="w-4 h-4" />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020816] text-white flex">
      {/* Desktop sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/[0.06] hidden md:flex flex-col fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-60 z-50 border-r border-white/[0.06] bg-[#020816] flex flex-col transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] sticky top-0 z-20 bg-[#020816]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold">hemis-auth admin</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded-lg text-slate-400 transition-all ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <X className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
