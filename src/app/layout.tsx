import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "UG-CMS | Uganda Case Management System",
  description: "Uganda Government Digital Case Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-app text-main antialiased">
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
