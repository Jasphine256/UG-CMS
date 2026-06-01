"use client";

import { useAuth } from "@/providers/auth-provider";
import { LogOut, Moon, Search, Sun, User, Bell, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 px-6 backdrop-blur-sm" style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--header-border)" }}>
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-app-hover hover:text-secondary">
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-app-hover hover:text-secondary"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-app-hover hover:text-secondary"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 border-l border-card-border pl-4 ml-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-medium text-main">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-more hover:bg-danger-50 hover:text-danger-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
