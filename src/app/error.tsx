"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-app p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-50">
              <AlertTriangle className="h-8 w-8 text-danger-500" />
            </div>
            <h1 className="text-xl font-bold text-main">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted">{error.message || "An unexpected error occurred"}</p>
            <Button onClick={reset} className="mt-6">
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
