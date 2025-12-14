import type { Group, Profile, Festival } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

export interface GroupWithDetails extends Group {
  member_count?: number;
  members?: Array<{
    user_id: string;
    profile: Profile;
  }>;
}

export interface FestivalRanking {
  festival: Festival;
  averageRating: number;
  topBands: Array<{
    name: string;
    avgRating: number;
  }>;
}

export interface GroupsSectionProps {
  user: User | null;
}
