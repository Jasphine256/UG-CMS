"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--card-bg)",
          color: "var(--foreground)",
          border: "1px solid var(--card-border)",
        },
      }}
    />
  );
}
