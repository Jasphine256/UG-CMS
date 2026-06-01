"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Gavel, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ugcms.gov");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Login failed");
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <Gavel className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">UG-CMS</h1>
            <p className="text-xs text-slate-400">Uganda Judiciary</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold text-white">
            Uganda Government Digital Case Management System
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            A comprehensive platform for managing the entire case lifecycle — from crime reporting
            to final appeal — across all courts in Uganda&apos;s judiciary system.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Courts", value: "50+" },
              { label: "Case Types", value: "6" },
              { label: "Court Levels", value: "9" },
              { label: "User Roles", value: "20" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-card/5 p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Republic of Uganda — Judiciary &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right login form */}
      <div className="flex w-full items-center justify-center bg-app p-8 lg:w-1/2">
        <Card className="w-full max-w-md border-card-border shadow-xl animate-fade-in">
          <CardHeader>
            <div className="mb-2 flex items-center justify-center lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
                <Gavel className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-main">Sign in to UG-CMS</h2>
            <p className="mt-1 text-sm text-muted">
              Enter your credentials to access your dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-600 animate-fade-in">
                  {error}
                </div>
              )}

              <Input
                id="email"
                type="email"
                label="Email address"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-muted-more hover:text-secondary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-app-hover p-4">
              <p className="text-xs font-medium text-muted">Demo Credentials</p>
              <p className="mt-1 text-xs text-muted-more">
                Admin: <code className="rounded bg-app-hover px-1 py-0.5">admin@ugcms.gov</code>{" "}
                / <code className="rounded bg-app-hover px-1 py-0.5">admin123</code>
              </p>
              <p className="mt-0.5 text-xs text-muted-more">
                All users: password is{" "}
                <code className="rounded bg-app-hover px-1 py-0.5">admin123</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
