"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "outline";
  size?: "sm" | "md";
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center font-medium rounded-full";
    
    const variants = {
      default: "bg-[var(--background-tertiary)] text-[var(--foreground-muted)]",
      primary: "bg-[var(--accent-primary)] text-white",
      secondary: "bg-[var(--accent-secondary)] text-white",
      success: "bg-[var(--accent-success)] text-white",
      warning: "bg-[var(--accent-warning)] text-black",
      error: "bg-[var(--accent-error)] text-white",
      outline: "border border-[var(--border)] text-[var(--foreground-muted)]",
    };
    
    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
    };
    
    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
