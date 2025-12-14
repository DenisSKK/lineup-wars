"use client";

import { Card, Badge, StarRating } from "@/components/ui";
import type { Band, Lineup } from "@/lib/types/database";

interface BandRatingCardProps {
  lineup: Lineup & { band: Band };
  currentRating: number | undefined;
  onRatingChange: (bandId: string, rating: number) => void;
}

export function BandRatingCard({
  lineup,
  currentRating,
  onRatingChange,
}: BandRatingCardProps) {
  const band = lineup.band;

  return (
    <Card variant="default" padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Band Info */}
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--foreground)]">
            {band.name}
          </h4>
          <div className="flex flex-wrap gap-2 mt-1">
            {band.genre && (
              <Badge variant="default" size="sm">{band.genre}</Badge>
            )}
            {band.country && (
              <Badge variant="outline" size="sm">{band.country}</Badge>
            )}
            {lineup.day_number && (
              <Badge variant="outline" size="sm">Day {lineup.day_number}</Badge>
            )}
            {lineup.stage && (
              <Badge variant="outline" size="sm">{lineup.stage}</Badge>
            )}
          </div>
        </div>
        
        {/* Star Rating */}
        <div className="flex items-center gap-2">
          <StarRating
            rating={currentRating || null}
            onRatingChange={(rating) => onRatingChange(band.id, rating)}
            size="lg"
          />
        </div>
      </div>
    </Card>
  );
}
