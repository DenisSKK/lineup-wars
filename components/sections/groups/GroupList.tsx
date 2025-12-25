"use client";

import { Users } from "lucide-react";
import { Card, SkeletonList } from "@/components/ui";
import { GroupCard } from "./GroupCard";
import type { GroupWithDetails } from "./types";
import { memo } from "react";

interface GroupListProps {
  groups: GroupWithDetails[];
  isLoading: boolean;
  userId: string;
  expandedDescriptions: Set<string>;
  onToggleDescription: (groupId: string, e: React.MouseEvent) => void;
  onOpenGroup: (group: GroupWithDetails) => void;
}

export const GroupList = memo(function GroupList({
  groups,
  isLoading,
  userId,
  expandedDescriptions,
  onToggleDescription,
  onOpenGroup,
}: GroupListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="default" padding="lg">
            <SkeletonList count={2} />
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <Users className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)] mb-2">
          You haven't joined any groups yet
        </p>
        <p className="text-sm text-[var(--foreground-subtle)]">
          Create a new group to start comparing festival ratings with friends
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          isOwner={group.created_by === userId}
          isExpanded={expandedDescriptions.has(group.id)}
          onToggleDescription={(e) => onToggleDescription(group.id, e)}
          onClick={() => onOpenGroup(group)}
        />
      ))}
    </div>
  );
});
