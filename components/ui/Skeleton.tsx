"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  const baseStyles = "animate-pulse bg-[var(--background-tertiary)]";
  
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };
  
  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6">
      <Skeleton className="h-40 w-full mb-4" />
      <Skeleton variant="text" className="w-3/4 mb-2" />
      <Skeleton variant="text" className="w-1/2 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton variant="text" className="w-1/3 mb-1" />
            <Skeleton variant="text" className="w-1/2 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonList };
