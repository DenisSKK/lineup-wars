"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Card, Button, Avatar } from "@/components/ui";
import type { Invitation } from "./types";
import { formatDate } from "./types";

interface InvitationCardProps {
  invitation: Invitation;
  isProcessing: boolean;
  variant: "pending" | "declined" | "request";
  onAccept?: () => void;
  onDecline?: () => void;
  onRequestToJoin?: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function InvitationCard({
  invitation,
  isProcessing,
  variant,
  onAccept,
  onDecline,
  onRequestToJoin,
  onApprove,
  onDeny,
}: InvitationCardProps) {
  if (variant === "pending") {
    return (
      <motion.div variants={itemVariants}>
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
                onClick={onAccept}
                isLoading={isProcessing}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onDecline}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (variant === "declined") {
    return (
      <motion.div variants={itemVariants}>
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
              onClick={onRequestToJoin}
              isLoading={isProcessing}
            >
              Request to Join
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Request variant
  return (
    <motion.div variants={itemVariants}>
      <Card variant="default" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar
            fallback={invitation.inviter.full_name || invitation.inviter.email}
            size="lg"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--foreground)]">
              {invitation.inviter.full_name || "Unknown User"}
            </h4>
            <p className="text-sm text-[var(--foreground-muted)]">
              {invitation.inviter.email}
            </p>
            <p className="text-sm text-[var(--foreground-subtle)] mt-2">
              Wants to join <span className="text-[var(--accent-primary)]">{invitation.group.name}</span> • {formatDate(invitation.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              isLoading={isProcessing}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDeny}
              disabled={isProcessing}
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
