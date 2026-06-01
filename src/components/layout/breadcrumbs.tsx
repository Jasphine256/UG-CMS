"use client";

import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted">
      <Link href="/dashboard" className="hover:text-secondary">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.slice(1).map((segment, i) => {
        const href = "/" + segments.slice(0, i + 2).join("/");
        const label = segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const isLast = i === segments.length - 2;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-secondary">{label}</span>
            ) : (
              <Link href={href} className="hover:text-secondary">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
