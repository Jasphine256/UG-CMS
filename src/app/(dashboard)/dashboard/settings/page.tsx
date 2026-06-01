"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="System configuration" />
      <Card className="border-card-border">
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="font-medium text-main">Appearance</h3>
            <div className="mt-2 flex gap-3">
              <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Light</Button>
              <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Dark</Button>
              <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>System</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
