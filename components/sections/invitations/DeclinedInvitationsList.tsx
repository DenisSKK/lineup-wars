"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { InvitationCard } from "./InvitationCard";
import type { Invitation } from "./types";

interface DeclinedInvitationsListProps {
  invitations: Invitation[];
  processingIds: Set<string>;
  onRequestToJoin: (id: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function DeclinedInvitationsList({
  invitations,
  processingIds,
  onRequestToJoin,
}: DeclinedInvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <AlertCircle className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)]">
          No declined invitations
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
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          isProcessing={processingIds.has(invitation.id)}
          variant="declined"
          onRequestToJoin={() => onRequestToJoin(invitation.id)}
        />
      ))}
    </motion.div>
  );
}
