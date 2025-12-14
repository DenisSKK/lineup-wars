"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, SkeletonList } from "@/components/ui";
import type { User } from "@supabase/supabase-js";

import { InvitationTabs } from "./InvitationTabs";
import { PendingInvitationsList } from "./PendingInvitationsList";
import { DeclinedInvitationsList } from "./DeclinedInvitationsList";
import { JoinRequestsList } from "./JoinRequestsList";
import type { Invitation, TabType } from "./types";

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
          <InvitationTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pendingCount={pendingInvitations.length}
            declinedCount={declinedInvitations.length}
            requestsCount={joinRequests.length}
          />
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
              {activeTab === "pending" && (
                <PendingInvitationsList
                  key="pending"
                  invitations={pendingInvitations}
                  processingIds={processingIds}
                  onAccept={acceptInvitation}
                  onDecline={declineInvitation}
                />
              )}
              
              {activeTab === "declined" && (
                <DeclinedInvitationsList
                  key="declined"
                  invitations={declinedInvitations}
                  processingIds={processingIds}
                  onRequestToJoin={requestToJoin}
                />
              )}
              
              {activeTab === "requests" && (
                <JoinRequestsList
                  key="requests"
                  requests={joinRequests}
                  processingIds={processingIds}
                  onApprove={approveRequest}
                  onDeny={denyRequest}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
