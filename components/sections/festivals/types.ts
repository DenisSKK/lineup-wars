import type { Festival, Band, Lineup } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

export interface FestivalWithLineup extends Festival {
  lineups?: Array<Lineup & { band: Band }>;
  bandCount?: number;
  _lineupCount?: Array<{ count: number }>;
}

export interface FestivalsSectionProps {
  user: User | null;
}
