"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
      xl: "h-16 w-16 text-lg",
    };
    
    const getFallbackInitials = () => {
      if (fallback) {
        return fallback.slice(0, 2).toUpperCase();
      }
      if (alt) {
        const words = alt.split(" ");
        return words.length > 1
          ? `${words[0][0]}${words[1][0]}`.toUpperCase()
          : alt.slice(0, 2).toUpperCase();
      }
      return "?";
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden",
          "bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]",
          "text-white font-medium",
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getFallbackInitials()}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

interface AvatarStackProps {
  avatars: Array<{ src?: string | null; alt?: string; fallback?: string }>;
  max?: number;
  size?: "sm" | "md" | "lg";
}

function AvatarStack({ avatars, max = 4, size = "sm" }: AvatarStackProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;
  
  return (
    <div className="flex -space-x-2">
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          fallback={avatar.fallback}
          size={size}
          className="ring-2 ring-[var(--background)]"
        />
      ))}
      {remaining > 0 && (
        <div className={cn(
          "inline-flex items-center justify-center rounded-full",
          "bg-[var(--background-tertiary)] text-[var(--foreground-muted)]",
          "ring-2 ring-[var(--background)]",
          size === "sm" && "h-8 w-8 text-xs",
          size === "md" && "h-10 w-10 text-sm",
          size === "lg" && "h-12 w-12 text-base",
        )}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarStack };
