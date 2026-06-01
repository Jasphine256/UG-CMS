import { cn } from "@/lib/utils/cn";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-hover text-muted-more">
        {icon || <FolderOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-main">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-6">
          <Button>{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
