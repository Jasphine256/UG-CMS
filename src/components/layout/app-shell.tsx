"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const params = new URLSearchParams();
      params.set("redirect", pathname);
      router.replace(`/login?${params.toString()}`);
    }
  }, [loading, user, router, pathname]);

  // Show nothing while checking auth (avoids flash of unauthenticated UI)
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-64">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
