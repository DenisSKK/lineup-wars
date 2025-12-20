import type { User } from "@supabase/supabase-js";

export interface Invitation {
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

export interface SentInvitation {
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
  invitee: {
    email: string;
    full_name: string | null;
  };
}

export type TabType = "pending" | "declined" | "requests" | "sent";

export interface InvitationsSectionProps {
  user: User | null;
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
