"use client";

import { Star, TrendingUp } from "lucide-react";
import { Card, Badge, StarRatingDisplay } from "@/components/ui";
import { useMemo } from "react";

interface RatingStatisticsProps {
  userRatings: Map<string, number>;
  totalBands: number;
}

interface RatingDistribution {
  starValue: number;
  count: number;
  percentage: number;
}

export function RatingStatistics({ userRatings, totalBands }: RatingStatisticsProps) {
  const statistics = useMemo(() => {
    const ratings = Array.from(userRatings.values());
    
    if (ratings.length === 0) {
      return null;
    }
    
    // Calculate average rating
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    const average = sum / ratings.length;
    
    // Calculate distribution
    // Group ratings by their star value (0.5 increments)
    const distributionMap = new Map<number, number>();
    
    ratings.forEach(rating => {
      // Rating is on 1-10 scale, convert to 0.5-5 scale with 0.5 increments
      const stars = rating / 2;
      const roundedStars = Math.round(stars * 2) / 2; // Round to nearest 0.5
      distributionMap.set(roundedStars, (distributionMap.get(roundedStars) || 0) + 1);
    });
    
    // Convert to array and sort by star value (descending)
    const distribution: RatingDistribution[] = Array.from(distributionMap.entries())
      .map(([starValue, count]) => ({
        starValue,
        count,
        percentage: (count / ratings.length) * 100,
      }))
      .sort((a, b) => b.starValue - a.starValue);
    
    return {
      average,
      ratedCount: ratings.length,
      distribution,
    };
  }, [userRatings]);
  
  if (!statistics) {
    return null;
  }
  
  return (
    <Card variant="default" padding="md" className="mb-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
            Your Rating Summary
          </h4>
          <Badge variant="primary" size="sm">
            {statistics.ratedCount} / {totalBands} rated
          </Badge>
        </div>
        
        {/* Average Rating */}
        <div className="flex items-center gap-2 p-3 bg-[var(--background-tertiary)] rounded-lg">
          <span className="text-sm text-[var(--foreground-muted)]">Average:</span>
          <StarRatingDisplay 
            rating={statistics.average} 
            size="sm"
            showValue={true}
          />
        </div>
        
        {/* Rating Distribution */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-[var(--foreground-muted)]">
            Rating Distribution
          </h5>
          <div className="space-y-1.5">
            {statistics.distribution.map(({ starValue, count, percentage }) => (
              <div key={starValue} className="flex items-center gap-2">
                <div className="flex items-center gap-1 min-w-[80px]">
                  <Star className="h-3 w-3 fill-[var(--accent-warning)] text-[var(--accent-warning)]" />
                  <span className="text-sm text-[var(--foreground)]">
                    {starValue.toFixed(1)}
                  </span>
                </div>
                <div className="flex-1 h-6 bg-[var(--background-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--foreground-muted)] min-w-[60px] text-right">
                  {count} band{count !== 1 ? 's' : ''} ({percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
