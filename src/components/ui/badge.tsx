import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary-100 text-primary-700",
        secondary: "bg-app-hover text-secondary",
        success: "bg-success-50 text-success-600",
        warning: "bg-warning-50 text-warning-600",
        danger: "bg-danger-50 text-danger-600",
        info: "bg-info-50 text-info-500",
        outline: "border border-input-border text-secondary",
        criminal: "bg-red-50 text-red-700",
        civil: "bg-blue-50 text-blue-700",
        family: "bg-purple-50 text-purple-700",
        land: "bg-lime-50 text-lime-700",
        commercial: "bg-cyan-50 text-cyan-700",
        anticorruption: "bg-orange-50 text-orange-700",
      },
      size: {
        sm: "px-2 py-0 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
