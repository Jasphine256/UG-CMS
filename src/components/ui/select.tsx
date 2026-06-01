"use client";

import { cn } from "@/lib/utils/cn";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border border-input-border bg-card px-3 py-2 pr-10 text-sm text-main transition-colors",
            "hover:border-muted-more",
            "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
            error && "border-danger-500",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-more" />
      </div>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
