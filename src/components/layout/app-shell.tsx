"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AuthProvider } from "@/providers/auth-provider";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col pl-64">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
