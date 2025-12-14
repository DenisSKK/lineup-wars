"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Plus, 
  Trophy, 
  Crown, 
  X, 
  UserPlus, 
  Trash2,
  ChevronRight,
  Music2,
  Search 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button, 
  Badge, 
  Input, 
  Textarea,
  Avatar,
  AvatarStack,
  Skeleton,
  SkeletonList,
  StarRatingDisplay
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Group, Profile, Festival } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

interface GroupWithDetails extends Group {
  member_count?: number;
  members?: Array<{
    user_id: string;
    profile: Profile;
  }>;
}

interface FestivalRanking {
  festival: Festival;
  averageRating: number;
  topBands: Array<{
    name: string;
    avgRating: number;
  }>;
}

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
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Invite form state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
    
    setIsSearching(true);
    
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
    setIsSearching(false);
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
    
    if (!confirm("Are you sure you want to delete this group?")) return;
    
    await supabase
      .from("groups")
      .delete()
      .eq("id", selectedGroup.id);
    
    setIsDrawerOpen(false);
    setSelectedGroup(null);
    fetchGroups();
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card variant="gradient" padding="lg" className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[var(--accent-primary)]" />
                  Create New Group
                </CardTitle>
                <CardDescription>
                  Start a new group to compare ratings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createGroup} className="space-y-4">
                  <Input
                    label="Group Name"
                    placeholder="Enter group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                  <Textarea
                    label="Description (optional)"
                    placeholder="What's this group about?"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isCreating}
                    disabled={!newGroupName.trim()}
                  >
                    Create Group
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Groups List */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} variant="default" padding="lg">
                    <SkeletonList count={2} />
                  </Card>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <Card variant="default" padding="lg" className="text-center">
                <Users className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
                <p className="text-[var(--foreground-muted)] mb-2">
                  You haven't joined any groups yet
                </p>
                <p className="text-sm text-[var(--foreground-subtle)]">
                  Create a new group to start comparing festival ratings with friends
                </p>
              </Card>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-4"
              >
                {groups.map((group) => (
                  <motion.div key={group.id} variants={itemVariants}>
                    <Card
                      variant="interactive"
                      padding="lg"
                      onClick={() => openGroupDrawer(group)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">
                              {group.name}
                            </h3>
                            {group.created_by === user.id && (
                              <Badge variant="primary" size="sm">
                                <Crown className="h-3 w-3 mr-1" />
                                Owner
                              </Badge>
                            )}
                          </div>
                          {group.description && (
                            <p className="text-sm text-[var(--foreground-muted)] mb-3">
                              {group.description}
                            </p>
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
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* Group Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedGroup && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
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
                        {selectedGroup.name}
                      </h3>
                      {selectedGroup.created_by === user.id && (
                        <Badge variant="primary" size="sm">
                          <Crown className="h-3 w-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                    </div>
                    {selectedGroup.description && (
                      <p className="text-[var(--foreground-muted)] mt-1">
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Drawer Content */}
              <div className="p-6 space-y-8">
                {/* Members */}
                <div>
                  <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-[var(--accent-primary)]" />
                    Members ({selectedGroup.members?.length || 0})
                  </h4>
                  
                  {selectedGroup.members && selectedGroup.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedGroup.members.map((member) => (
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
                          {member.user_id === selectedGroup.created_by && (
                            <Badge variant="secondary" size="sm">Owner</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <SkeletonList count={3} />
                  )}
                </div>
                
                {/* Invite Users (owner only) */}
                {selectedGroup.created_by === user.id && (
                  <div>
                    <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-[var(--accent-primary)]" />
                      Invite Users
                    </h4>
                    
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      icon={<Search className="h-5 w-5" />}
                    />
                    
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
                              onClick={() => inviteUser(profile.id)}
                            >
                              Invite
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Festival Rankings */}
                <div>
                  <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[var(--accent-primary)]" />
                    Festival Rankings
                  </h4>
                  
                  {isLoadingRankings ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-32" />
                      ))}
                    </div>
                  ) : rankings.length === 0 ? (
                    <Card variant="default" padding="md" className="text-center">
                      <Music2 className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-3" />
                      <p className="text-[var(--foreground-muted)]">
                        No ratings yet. Start rating bands to see rankings!
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {rankings.map((ranking, index) => (
                        <Card key={ranking.festival.id} variant="default" padding="md">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "flex items-center justify-center w-12 h-12 rounded-xl font-bold text-xl",
                              index === 0 && "bg-yellow-500/20 text-yellow-500",
                              index === 1 && "bg-gray-400/20 text-gray-400",
                              index === 2 && "bg-orange-500/20 text-orange-500",
                              index > 2 && "bg-[var(--background-tertiary)] text-[var(--foreground-muted)]"
                            )}>
                              #{index + 1}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-[var(--foreground)] mb-2">
                                {ranking.festival.name}
                              </h5>
                              <div className="flex items-center gap-2 mb-2">
                                <StarRatingDisplay 
                                  rating={ranking.averageRating} 
                                  size="sm"
                                  showValue={false}
                                />
                              </div>
                              {ranking.topBands.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {ranking.topBands.map((band) => (
                                    <Badge key={band.name} variant="primary" size="sm">
                                      {band.name} ({band.avgRating.toFixed(1)})
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Delete Group (owner only) */}
                {selectedGroup.created_by === user.id && (
                  <div className="pt-4 border-t border-[var(--border)]">
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={deleteGroup}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Group
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
