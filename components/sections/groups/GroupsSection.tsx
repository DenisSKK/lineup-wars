"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button, ConfirmModal } from "@/components/ui";
import type { Group, Profile } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

import { CreateGroupForm } from "./CreateGroupForm";
import { GroupList } from "./GroupList";
import { GroupDetailDrawer } from "./GroupDetailDrawer";
import type { GroupWithDetails, FestivalRanking } from "./types";

interface GroupsSectionProps {
  user: User | null;
}

export function GroupsSection({ user }: GroupsSectionProps) {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rankings, setRankings] = useState<FestivalRanking[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [isDrawerDescriptionExpanded, setIsDrawerDescriptionExpanded] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Invite form state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  
  const supabase = createClient();
  
  // Fetch user's groups
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch groups where user is a member
    const { data: memberGroups } = await supabase
      .from("group_members")
      .select(`
        group:groups(
          *,
          group_members(count)
        )
      `)
      .eq("user_id", user.id);
    
    // Fetch groups created by user
    const { data: createdGroups } = await supabase
      .from("groups")
      .select(`
        *,
        group_members(count)
      `)
      .eq("created_by", user.id);
    
    const allGroups: GroupWithDetails[] = [];
    const seenIds = new Set<string>();
    
    createdGroups?.forEach((g: Group & { group_members: { count: number }[] }) => {
      if (!seenIds.has(g.id)) {
        seenIds.add(g.id);
        allGroups.push({
          ...g,
          member_count: g.group_members?.[0]?.count || 0,
        });
      }
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memberGroups?.forEach((mg: any) => {
      const group = mg.group as (Group & { group_members: { count: number }[] }) | null;
      if (group && !seenIds.has(group.id)) {
        seenIds.add(group.id);
        allGroups.push({
          ...group,
          member_count: group.group_members?.[0]?.count || 0,
        });
      }
    });
    
    setGroups(allGroups);
    setIsLoading(false);
  }, [user, supabase]);
  
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  
  // Create new group
  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;
    
    setIsCreating(true);
    
    const { data: newGroup, error } = await supabase
      .from("groups")
      .insert({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (!error && newGroup) {
      // Add creator as member
      await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
        });
      
      setNewGroupName("");
      setNewGroupDescription("");
      fetchGroups();
    }
    
    setIsCreating(false);
  };
  
  // Open group detail drawer
  const openGroupDrawer = async (group: GroupWithDetails) => {
    setSelectedGroup(group);
    setIsDrawerOpen(true);
    setIsLoadingRankings(true);
    setIsDrawerDescriptionExpanded(false);
    
    // Fetch group members
    const { data: members } = await supabase
      .from("group_members")
      .select(`
        user_id,
        profile:profiles(*)
      `)
      .eq("group_id", group.id);
    
    if (members) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedMembers = members.map((m: any) => ({
        user_id: m.user_id as string,
        profile: (Array.isArray(m.profile) ? m.profile[0] : m.profile) as Profile,
      }));
      setSelectedGroup({
        ...group,
        members: typedMembers,
      });
    }
    
    // Fetch festival rankings for the group
    await fetchRankings(group.id);
  };
  
  // Fetch festival rankings
  const fetchRankings = async (groupId: string) => {
    setIsLoadingRankings(true);
    
    // Get group member IDs
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    
    if (!members || members.length === 0) {
      setRankings([]);
      setIsLoadingRankings(false);
      return;
    }
    
    const memberIds = members.map((m: { user_id: string }) => m.user_id);
    
    // Get all festivals with ratings from group members
    const { data: festivals } = await supabase
      .from("festivals")
      .select("*");
    
    const { data: ratings } = await supabase
      .from("band_ratings")
      .select(`
        *,
        band:bands(name)
      `)
      .in("user_id", memberIds);
    
    if (!festivals || !ratings) {
      setRankings([]);
      setIsLoadingRankings(false);
      return;
    }
    
    // Calculate rankings per festival
    const festivalRankings: FestivalRanking[] = [];
    
    for (const festival of festivals) {
      const festivalRatings = ratings.filter(
        (r: { festival_id: string }) => r.festival_id === festival.id
      );
      
      if (festivalRatings.length === 0) continue;
      
      // Calculate average rating
      const avgRating = festivalRatings.reduce(
        (sum: number, r: { rating: number }) => sum + r.rating, 0
      ) / festivalRatings.length;
      
      // Get top bands
      const bandRatings = new Map<string, { name: string; total: number; count: number }>();
      
      festivalRatings.forEach((r: { band: { name: string }; band_id: string; rating: number }) => {
        const existing = bandRatings.get(r.band_id);
        if (existing) {
          existing.total += r.rating;
          existing.count += 1;
        } else {
          bandRatings.set(r.band_id, {
            name: r.band.name,
            total: r.rating,
            count: 1,
          });
        }
      });
      
      const topBands = Array.from(bandRatings.values())
        .map((b) => ({
          name: b.name,
          avgRating: b.total / b.count,
        }))
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, 3);
      
      festivalRankings.push({
        festival,
        averageRating: avgRating,
        topBands,
      });
    }
    
    // Sort by average rating
    festivalRankings.sort((a, b) => b.averageRating - a.averageRating);
    setRankings(festivalRankings);
    setIsLoadingRankings(false);
  };
  
  // Search users for invitation
  const searchUsers = async (query: string) => {
    if (!user || !selectedGroup || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Get existing members and pending invitations
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", selectedGroup.id);
    
    const { data: invitations } = await supabase
      .from("group_invitations")
      .select("invited_user_id")
      .eq("group_id", selectedGroup.id)
      .in("status", ["pending", "requested"]);
    
    const excludeIds = new Set([
      user.id,
      ...(members?.map((m: { user_id: string }) => m.user_id) || []),
      ...(invitations?.map((i: { invited_user_id: string }) => i.invited_user_id) || []),
    ]);
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5);
    
    setSearchResults(
      profiles?.filter((p: Profile) => !excludeIds.has(p.id)) || []
    );
  };
  
  // Invite user
  const inviteUser = async (invitedUserId: string) => {
    if (!user || !selectedGroup) return;
    
    await supabase
      .from("group_invitations")
      .insert({
        group_id: selectedGroup.id,
        invited_user_id: invitedUserId,
        invited_by: user.id,
        status: "pending",
      });
    
    setSearchQuery("");
    setSearchResults([]);
  };
  
  // Delete group
  const deleteGroup = async () => {
    if (!selectedGroup || !user || selectedGroup.created_by !== user.id) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Delete Group",
      message: `Are you sure you want to delete "${selectedGroup.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        await supabase
          .from("groups")
          .delete()
          .eq("id", selectedGroup.id);
        
        setIsDrawerOpen(false);
        setSelectedGroup(null);
        fetchGroups();
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  };
  
  // Toggle description expansion
  const toggleDescription = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };
  
  // Remove member from group
  const removeMember = async (memberId: string) => {
    if (!selectedGroup || !user || selectedGroup.created_by !== user.id) return;
    if (memberId === selectedGroup.created_by) return; // Can't remove owner
    
    const memberToRemove = selectedGroup.members?.find(m => m.user_id === memberId);
    const memberName = memberToRemove?.profile.full_name || memberToRemove?.profile.email || "this member";
    
    setConfirmModal({
      isOpen: true,
      title: "Remove Member",
      message: `Are you sure you want to remove ${memberName} from the group?`,
      onConfirm: async () => {
        const { data, error } = await supabase.rpc("remove_group_member", {
          p_group_id: selectedGroup.id,
          p_user_id: memberId,
        });
        
        if (!error && data?.success) {
          // Refresh group members
          openGroupDrawer(selectedGroup);
        } else {
          // Handle error - could show a toast notification here
          console.error("Failed to remove member:", error || data?.error);
        }
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });
      },
    });
  };
  
  if (!user) {
    return (
      <section id="groups" className="py-20 bg-[var(--background-secondary)]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            My Groups
          </h2>
          <p className="text-[var(--foreground-muted)] mb-8">
            Sign in to create groups and compare ratings with friends
          </p>
          <Button onClick={() => window.location.href = "/login"}>
            Sign In to Continue
          </Button>
        </div>
      </section>
    );
  }
  
  return (
    <section id="groups" className="py-20 bg-[var(--background-secondary)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            My Groups
          </h2>
          <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
            Create groups with friends and see which festival has the best lineup based on your collective ratings.
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Create Group Form */}
          <CreateGroupForm
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            newGroupDescription={newGroupDescription}
            setNewGroupDescription={setNewGroupDescription}
            isCreating={isCreating}
            onSubmit={createGroup}
          />
          
          {/* Groups List */}
          <div className="lg:col-span-2">
            <GroupList
              groups={groups}
              isLoading={isLoading}
              userId={user.id}
              expandedDescriptions={expandedDescriptions}
              onToggleDescription={toggleDescription}
              onOpenGroup={openGroupDrawer}
            />
          </div>
        </div>
      </div>
      
      {/* Group Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedGroup && (
          <GroupDetailDrawer
            group={selectedGroup}
            currentUserId={user.id}
            isDescriptionExpanded={isDrawerDescriptionExpanded}
            onToggleDescription={() => setIsDrawerDescriptionExpanded(!isDrawerDescriptionExpanded)}
            onClose={() => setIsDrawerOpen(false)}
            onRemoveMember={removeMember}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            onSearch={searchUsers}
            onInvite={inviteUser}
            rankings={rankings}
            isLoadingRankings={isLoadingRankings}
            onDeleteGroup={deleteGroup}
          />
        )}
      </AnimatePresence>
      
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
      />
    </section>
  );
}
