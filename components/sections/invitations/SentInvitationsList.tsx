"use client";

import { motion } from "framer-motion";
import { Send, Check, X, Clock, UserPlus } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { formatDate } from "./types";
import type { SentInvitation } from "./types";

interface SentInvitationsListProps {
  invitations: SentInvitation[];
}

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="warning" size="sm">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="success" size="sm">
          <Check className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case "declined":
      return (
        <Badge variant="danger" size="sm">
          <X className="h-3 w-3 mr-1" />
          Declined
        </Badge>
      );
    case "requested":
      return (
        <Badge variant="info" size="sm">
          <UserPlus className="h-3 w-3 mr-1" />
          Requested to Join
        </Badge>
      );
    default:
      return null;
  }
};

export function SentInvitationsList({ invitations }: SentInvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <Send className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)]">
          No sent invitations
        </p>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {invitations.map((invitation) => (
        <motion.div key={invitation.id} variants={itemVariants}>
          <Card variant="default" padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] truncate">
                    {invitation.group.name}
                  </h3>
                  {getStatusBadge(invitation.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Invited:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {invitation.invitee.full_name || invitation.invitee.email}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--foreground-subtle)]">
                    Sent on {formatDate(invitation.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
