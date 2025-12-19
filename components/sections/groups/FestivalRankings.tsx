"use client";

import { Trophy, Music2 } from "lucide-react";
import { Card, Badge, Skeleton, StarRatingDisplay } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FestivalRanking } from "./types";

interface FestivalRankingsProps {
  rankings: FestivalRanking[];
  isLoading: boolean;
}

export function FestivalRankings({ rankings, isLoading }: FestivalRankingsProps) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[var(--accent-primary)]" />
        Festival Rankings
      </h4>
      
      {isLoading ? (
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
                      showValue={true}
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
  );
}
