"use client";

import { UserPlus, Search } from "lucide-react";
import { Avatar, Button, Input } from "@/components/ui";
import type { Profile } from "@/lib/types/database";

interface InviteUsersSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Profile[];
  onSearch: (query: string) => void;
  onInvite: (userId: string) => void;
}

export function InviteUsersSection({
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onInvite,
}: InviteUsersSectionProps) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-[var(--accent-primary)]" />
        Invite Users
      </h4>
      
      <div className="flex gap-2">
        <Input
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-5 w-5" />}
        />
        <Button
          size="md"
          onClick={() => onSearch(searchQuery)}
          disabled={searchQuery.length < 2}
        >
          Search
        </Button>
      </div>
      
      {searchResults.length > 0 && (
        <div className="mt-3 space-y-2">
          {searchResults.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--background-tertiary)]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  fallback={profile.full_name || profile.email}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {profile.full_name || "No name"}
                  </p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {profile.email}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onInvite(profile.id)}
              >
                Invite
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
