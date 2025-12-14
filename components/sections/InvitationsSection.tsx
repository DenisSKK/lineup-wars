"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Check, 
  X, 
  UserPlus, 
  Clock,
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  Card, 
  CardContent, 
  Button, 
  Badge, 
  Avatar,
  Skeleton,
  SkeletonList
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface Invitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined" | "requested";
  created_at: string;
  group: {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
  };
  inviter: {
    email: string;
    full_name: string | null;
  };
}

type TabType = "pending" | "declined" | "requests";

interface InvitationsSectionProps {
  user: User | null;
}

export function InvitationsSection({ user }: InvitationsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [declinedInvitations, setDeclinedInvitations] = useState<Invitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const supabase = createClient();
  
  // Fetch all invitations
  const fetchInvitations = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Fetch pending invitations for the user
    const { data: pending } = await supabase
      .from("group_invitations")
      .select(`
        *,
        group:groups(id, name, description, created_by),
        inviter:invited_by(email, full_name)
      `)
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    // Fetch declined invitations
    const { data: declined } = await supabase
      .from("group_invitations")
      .select(`
        *,
        group:groups(id, name, description, created_by),
        inviter:invited_by(email, full_name)
      `)
      .eq("invited_user_id", user.id)
      .eq("status", "declined")
      .order("created_at", { ascending: false });
    
    // Fetch join requests (for groups the user owns)
    const { data: userGroups } = await supabase
      .from("groups")
      .select("id")
      .eq("created_by", user.id);
    
    let requests: Invitation[] = [];
    if (userGroups && userGroups.length > 0) {
      const groupIds = userGroups.map((g: { id: string }) => g.id);
      
      const { data: requestsData } = await supabase
        .from("group_invitations")
        .select(`
          *,
          group:groups(id, name, description, created_by),
          inviter:invited_user_id(email, full_name)
        `)
        .in("group_id", groupIds)
        .eq("status", "requested")
        .order("created_at", { ascending: false });
      
      requests = (requestsData || []).map((r: Invitation & { inviter: { email: string; full_name: string | null } }) => ({
        ...r,
        inviter: r.inviter, // For requests, inviter is actually the requester
      }));
    }
    
    setPendingInvitations(pending || []);
    setDeclinedInvitations(declined || []);
    setJoinRequests(requests);
    setIsLoading(false);
  }, [user, supabase]);
  
  useEffect(() => {
    fetchInvitations();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel("invitations-section")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_invitations",
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInvitations, supabase]);
  
  // Accept invitation
  const acceptInvitation = async (invitationId: string) => {
    if (!user) return;
    
    setProcessingIds((prev) => new Set([...prev, invitationId]));
    
    const invitation = pendingInvitations.find((i) => i.id === invitationId);
    if (!invitation) return;
    
    // Update invitation status
    await supabase
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
    
    // Add user to group members
    await supabase
      .from("group_members")
      .insert({
        group_id: invitation.group_id,
        user_id: user.id,
      });
    
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    fetchInvitations();
  };
  
  // Decline invitation
  const declineInvitation = async (invitationId: string) => {
    setProcessingIds((prev) => new Set([...prev, invitationId]));
    
    await supabase
      .from("group_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
    
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    fetchInvitations();
  };
  
  // Request to rejoin a declined group
  const requestToJoin = async (invitationId: string) => {
    setProcessingIds((prev) => new Set([...prev, invitationId]));
    
    await supabase
      .from("group_invitations")
      .update({ status: "requested" })
      .eq("id", invitationId);
    
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    fetchInvitations();
  };
  
  // Approve join request (group owner)
  const approveRequest = async (invitationId: string) => {
    setProcessingIds((prev) => new Set([...prev, invitationId]));
    
    const request = joinRequests.find((r) => r.id === invitationId);
    if (!request) return;
    
    // Update invitation status
    await supabase
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
    
    // Add user to group members
    await supabase
      .from("group_members")
      .insert({
        group_id: request.group_id,
        user_id: request.invited_user_id,
      });
    
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    fetchInvitations();
  };
  
  // Deny join request
  const denyRequest = async (invitationId: string) => {
    setProcessingIds((prev) => new Set([...prev, invitationId]));
    
    await supabase
      .from("group_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
    
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    fetchInvitations();
  };
  
  const tabs = [
    { 
      id: "pending" as TabType, 
      label: "Pending", 
      count: pendingInvitations.length,
      icon: <Clock className="h-4 w-4" />,
    },
    { 
      id: "declined" as TabType, 
      label: "Declined", 
      count: declinedInvitations.length,
      icon: <X className="h-4 w-4" />,
    },
    { 
      id: "requests" as TabType, 
      label: "Join Requests", 
      count: joinRequests.length,
      icon: <UserPlus className="h-4 w-4" />,
    },
  ];
  
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
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  
  if (!user) {
    return (
      <section id="invitations" className="py-20 bg-[var(--background)]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            Invitations
          </h2>
          <p className="text-[var(--foreground-muted)] mb-8">
            Sign in to view and manage your group invitations
          </p>
          <Button onClick={() => window.location.href = "/login"}>
            Sign In to Continue
          </Button>
        </div>
      </section>
    );
  }
  
  return (
    <section id="invitations" className="py-20 bg-[var(--background)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            Invitations
          </h2>
          <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
            Manage your group invitations and join requests
          </p>
        </motion.div>
        
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex bg-[var(--background-secondary)] rounded-xl p-1 border border-[var(--border)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "text-[var(--foreground)] bg-[var(--background-tertiary)]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 text-xs rounded-full",
                    activeTab === tab.id
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--background-tertiary)] text-[var(--foreground-muted)]"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
        
        {/* Content */}
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} variant="default" padding="lg">
                  <SkeletonList count={2} />
                </Card>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* Pending Tab */}
              {activeTab === "pending" && (
                <motion.div
                  key="pending"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                >
                  {pendingInvitations.length === 0 ? (
                    <Card variant="default" padding="lg" className="text-center">
                      <Mail className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
                      <p className="text-[var(--foreground-muted)]">
                        No pending invitations
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => (
                        <motion.div key={invitation.id} variants={itemVariants}>
                          <Card variant="default" padding="lg">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <Avatar
                                fallback={invitation.group.name}
                                size="lg"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-[var(--foreground)]">
                                  {invitation.group.name}
                                </h4>
                                {invitation.group.description && (
                                  <p className="text-sm text-[var(--foreground-muted)] mt-1">
                                    {invitation.group.description}
                                  </p>
                                )}
                                <p className="text-sm text-[var(--foreground-subtle)] mt-2">
                                  Invited by {invitation.inviter.full_name || invitation.inviter.email} • {formatDate(invitation.created_at)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => acceptInvitation(invitation.id)}
                                  isLoading={processingIds.has(invitation.id)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => declineInvitation(invitation.id)}
                                  disabled={processingIds.has(invitation.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Declined Tab */}
              {activeTab === "declined" && (
                <motion.div
                  key="declined"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                >
                  {declinedInvitations.length === 0 ? (
                    <Card variant="default" padding="lg" className="text-center">
                      <AlertCircle className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
                      <p className="text-[var(--foreground-muted)]">
                        No declined invitations
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {declinedInvitations.map((invitation) => (
                        <motion.div key={invitation.id} variants={itemVariants}>
                          <Card variant="default" padding="lg">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <Avatar
                                fallback={invitation.group.name}
                                size="lg"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-[var(--foreground)]">
                                  {invitation.group.name}
                                </h4>
                                {invitation.group.description && (
                                  <p className="text-sm text-[var(--foreground-muted)] mt-1">
                                    {invitation.group.description}
                                  </p>
                                )}
                                <p className="text-sm text-[var(--foreground-subtle)] mt-2">
                                  Declined on {formatDate(invitation.created_at)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => requestToJoin(invitation.id)}
                                isLoading={processingIds.has(invitation.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Request to Join
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Join Requests Tab */}
              {activeTab === "requests" && (
                <motion.div
                  key="requests"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                >
                  {joinRequests.length === 0 ? (
                    <Card variant="default" padding="lg" className="text-center">
                      <UserPlus className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
                      <p className="text-[var(--foreground-muted)]">
                        No pending join requests
                      </p>
                      <p className="text-sm text-[var(--foreground-subtle)] mt-2">
                        Join requests from users wanting to join your groups will appear here
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {joinRequests.map((request) => (
                        <motion.div key={request.id} variants={itemVariants}>
                          <Card variant="default" padding="lg">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <Avatar
                                fallback={request.inviter.full_name || request.inviter.email}
                                size="lg"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-[var(--foreground)]">
                                  {request.inviter.full_name || "Unknown User"}
                                </h4>
                                <p className="text-sm text-[var(--foreground-muted)]">
                                  {request.inviter.email}
                                </p>
                                <p className="text-sm text-[var(--foreground-subtle)] mt-2">
                                  Wants to join <span className="text-[var(--accent-primary)]">{request.group.name}</span> • {formatDate(request.created_at)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveRequest(request.id)}
                                  isLoading={processingIds.has(request.id)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => denyRequest(request.id)}
                                  disabled={processingIds.has(request.id)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Deny
                                </Button>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
