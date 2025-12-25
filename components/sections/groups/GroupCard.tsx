"use client";

import { memo } from "react";
import { Users, Crown, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { GroupWithDetails } from "./types";

interface GroupCardProps {
  group: GroupWithDetails;
  isOwner: boolean;
  isExpanded: boolean;
  onToggleDescription: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const GroupCard = memo(function GroupCard({
  group,
  isOwner,
  isExpanded,
  onToggleDescription,
  onClick,
}: GroupCardProps) {
  return (
    <Card
      variant="interactive"
      padding="lg"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {group.name}
            </h3>
            {isOwner && (
              <Badge variant="primary" size="sm">
                <Crown className="h-3 w-3 mr-1" />
                Owner
              </Badge>
            )}
          </div>
          {group.description && (
            <div className="mb-3">
              <p className={cn(
                "text-sm text-[var(--foreground-muted)]",
                !isExpanded && "line-clamp-1"
              )}>
                {group.description}
              </p>
              {group.description.length > 80 && (
                <button
                  onClick={onToggleDescription}
                  className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] mt-1 font-medium"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {group.member_count || 0} members
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--foreground-subtle)]" />
      </div>
    </Card>
  );
});
