"use client";

import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, PlusCircle, Calendar, Search,
  FileSearch, Handshake, Scale, Building2, Landmark, Users,
  Shield, FileText, BarChart3, History, Settings, Bell,
  ChevronDown, ChevronLeft, Gavel, LogOut,
} from "lucide-react";
import { navigation } from "@/config/navigation";
import { useAuth } from "@/providers/auth-provider";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, FolderOpen, PlusCircle, Calendar, Search,
  FileSearch, Handshake, Scale, Building2, Landmark, Users,
  Shield, FileText, BarChart3, History, Settings, Bell, Gavel,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(navigation.map((g) => g.title)),
  );

  const userRoles = user?.roles ?? [];

  function toggleGroup(title: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  // Filter groups and items by user roles
  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.some((r) => userRoles.includes(r)),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-card-border bg-slate-900 text-slate-300 transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
      style={{ backgroundColor: "var(--sidebar-bg)", color: "var(--sidebar-fg)" }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Gavel className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">UG-CMS</span>
            <span className="text-[10px] text-slate-400">Uganda Judiciary</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {visibleNavigation.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.title)}
                className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                {group.title}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !expandedGroups.has(group.title) && "-rotate-90",
                  )}
                />
              </button>
            )}
            {(collapsed || expandedGroups.has(group.title)) &&
              group.items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                      isActive
                        ? "font-medium text-white"
                        : "text-slate-400 hover:bg-card/5 hover:text-white",
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-white/10 p-2 space-y-1">
        {/* User info (compact) */}
        {user && (
          <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", collapsed && "justify-center")}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-300">{user.firstName} {user.lastName}</p>
                <p className="truncate text-[10px] text-slate-500">{user.email}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-card/5 hover:text-white"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
