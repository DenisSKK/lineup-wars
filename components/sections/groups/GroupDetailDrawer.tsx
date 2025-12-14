"use client";

import { motion } from "framer-motion";
import { Crown, X, Trash2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MembersList } from "./MembersList";
import { InviteUsersSection } from "./InviteUsersSection";
import { FestivalRankings } from "./FestivalRankings";
import type { GroupWithDetails, FestivalRanking } from "./types";
import type { Profile } from "@/lib/types/database";

interface GroupDetailDrawerProps {
  group: GroupWithDetails;
  currentUserId: string;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
  onClose: () => void;
  
  // Members
  onRemoveMember: (memberId: string) => void;
  
  // Invite
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Profile[];
  onSearch: (query: string) => void;
  onInvite: (userId: string) => void;
  
  // Rankings
  rankings: FestivalRanking[];
  isLoadingRankings: boolean;
  
  // Delete
  onDeleteGroup: () => void;
}

export function GroupDetailDrawer({
  group,
  currentUserId,
  isDescriptionExpanded,
  onToggleDescription,
  onClose,
  onRemoveMember,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onInvite,
  rankings,
  isLoadingRankings,
  onDeleteGroup,
}: GroupDetailDrawerProps) {
  const isOwner = group.created_by === currentUserId;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl bg-[var(--background-secondary)] border-l border-[var(--border)] overflow-y-auto"
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-[var(--background-secondary)]/95 backdrop-blur-sm border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-[var(--foreground)]">
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
                <div className="mt-1">
                  <p className={cn(
                    "text-[var(--foreground-muted)]",
                    !isDescriptionExpanded && "line-clamp-1"
                  )}>
                    {group.description}
                  </p>
                  {group.description.length > 80 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDescription();
                      }}
                      className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] mt-1 font-medium"
                    >
                      {isDescriptionExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Drawer Content */}
        <div className="p-6 space-y-8">
          {/* Members */}
          <MembersList
            members={group.members}
            ownerId={group.created_by}
            currentUserId={currentUserId}
            onRemoveMember={onRemoveMember}
          />
          
          {/* Invite Users (owner only) */}
          {isOwner && (
            <InviteUsersSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              onSearch={onSearch}
              onInvite={onInvite}
            />
          )}
          
          {/* Festival Rankings */}
          <FestivalRankings
            rankings={rankings}
            isLoading={isLoadingRankings}
          />
          
          {/* Delete Group (owner only) */}
          {isOwner && (
            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                variant="danger"
                className="w-full"
                onClick={onDeleteGroup}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Group
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
