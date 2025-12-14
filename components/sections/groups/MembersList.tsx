"use client";

import { Users, X } from "lucide-react";
import { Avatar, Badge, Button, SkeletonList } from "@/components/ui";
import type { Profile } from "@/lib/types/database";

interface Member {
  user_id: string;
  profile: Profile;
}

interface MembersListProps {
  members: Member[] | undefined;
  ownerId: string;
  currentUserId: string;
  onRemoveMember: (memberId: string) => void;
}

export function MembersList({
  members,
  ownerId,
  currentUserId,
  onRemoveMember,
}: MembersListProps) {
  const isOwner = currentUserId === ownerId;

  return (
    <div>
      <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-[var(--accent-primary)]" />
        Members ({members?.length || 0})
      </h4>
      
      {members && members.length > 0 ? (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--background-tertiary)]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  fallback={member.profile.full_name || member.profile.email}
                  size="md"
                />
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {member.profile.full_name || "No name"}
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {member.profile.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.user_id === ownerId ? (
                  <Badge variant="secondary" size="sm">Owner</Badge>
                ) : isOwner ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveMember(member.user_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <SkeletonList count={3} />
      )}
    </div>
  );
}
