import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-hover">
          <FileQuestion className="h-8 w-8 text-muted-more" />
        </div>
        <h1 className="text-xl font-bold text-main">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you are looking for does not exist or has been moved.</p>
        <Link href="/dashboard" className="mt-6 inline-block">
          <Button><Home className="h-4 w-4" /> Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
