"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input-border bg-card px-3 py-2 text-sm text-main placeholder:text-muted-more transition-colors",
          "hover:border-muted-more",
          "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
          "disabled:cursor-not-allowed disabled:bg-app disabled:text-muted",
          error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";

export { Input };
