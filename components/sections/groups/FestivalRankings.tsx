"use client";

import { Trophy, Music2, Star, TrendingUp } from "lucide-react";
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
                  
                  {/* Group Average Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[var(--foreground-muted)]">Group Avg:</span>
                    <StarRatingDisplay 
                      rating={ranking.averageRating} 
                      size="sm"
                      showValue={true}
                    />
                    {ranking.ratingCount && ranking.memberCount && (
                      <Badge variant="outline" size="sm">
                        {ranking.ratingCount} rating{ranking.ratingCount !== 1 ? 's' : ''} from {ranking.memberCount} member{ranking.memberCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  
                  {/* User's Rating */}
                  {ranking.userRating !== undefined && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--background-tertiary)] rounded-md">
                      <TrendingUp className="h-4 w-4 text-[var(--accent-primary)]" />
                      <span className="text-xs text-[var(--foreground-muted)]">Your Avg:</span>
                      <StarRatingDisplay 
                        rating={ranking.userRating} 
                        size="sm"
                        showValue={true}
                      />
                    </div>
                  )}
                  
                  {/* Rating Distribution (compact) */}
                  {ranking.ratingDistribution && ranking.ratingDistribution.length > 0 && (
                    <div className="mb-2 space-y-1">
                      <h6 className="text-xs font-medium text-[var(--foreground-muted)]">Rating Distribution</h6>
                      <div className="flex flex-wrap gap-1">
                        {ranking.ratingDistribution.slice(0, 5).map(({ starValue, count }) => (
                          <Badge key={starValue} variant="outline" size="sm" className="text-xs">
                            <Star className="h-2.5 w-2.5 fill-[var(--accent-warning)] text-[var(--accent-warning)] mr-1" />
                            {starValue.toFixed(1)}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Top Bands */}
                  {ranking.topBands.length > 0 && (
                    <div>
                      <h6 className="text-xs font-medium text-[var(--foreground-muted)] mb-1">Top Rated Bands</h6>
                      <div className="flex flex-wrap gap-2">
                        {ranking.topBands.map((band) => (
                          <Badge key={band.name} variant="primary" size="sm">
                            {band.name} ({band.avgRating.toFixed(1)})
                          </Badge>
                        ))}
                      </div>
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
