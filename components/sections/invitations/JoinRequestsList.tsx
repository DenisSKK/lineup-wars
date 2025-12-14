"use client";

import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui";
import { InvitationCard } from "./InvitationCard";
import type { Invitation } from "./types";

interface JoinRequestsListProps {
  requests: Invitation[];
  processingIds: Set<string>;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function JoinRequestsList({
  requests,
  processingIds,
  onApprove,
  onDeny,
}: JoinRequestsListProps) {
  if (requests.length === 0) {
    return (
      <Card variant="default" padding="lg" className="text-center">
        <UserPlus className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)]">
          No pending join requests
        </p>
        <p className="text-sm text-[var(--foreground-subtle)] mt-2">
          Join requests from users wanting to join your groups will appear here
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
      {requests.map((request) => (
        <InvitationCard
          key={request.id}
          invitation={request}
          isProcessing={processingIds.has(request.id)}
          variant="request"
          onApprove={() => onApprove(request.id)}
          onDeny={() => onDeny(request.id)}
        />
      ))}
    </motion.div>
  );
}
