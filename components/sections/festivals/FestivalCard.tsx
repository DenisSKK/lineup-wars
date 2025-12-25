"use client";

import { memo } from "react";
import { Calendar, MapPin, Music2, Star, ChevronRight } from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FestivalWithLineup, FestivalRatingStatus } from "./types";

interface FestivalCardProps {
  festival: FestivalWithLineup;
  isSelected: boolean;
  ratingStatus: FestivalRatingStatus;
  onClick: () => void;
}

export const FestivalCard = memo(function FestivalCard({ 
  festival, 
  isSelected, 
  ratingStatus, 
  onClick 
}: FestivalCardProps) {
  const getBadgeConfig = () => {
    switch (ratingStatus) {
      case "not-rated":
        return { variant: "default" as const, icon: Star, text: "Not Rated" };
      case "rating":
        return { variant: "warning" as const, icon: Star, text: "Rating" };
      case "rated":
        return { variant: "success" as const, icon: Star, text: "Rated" };
    }
  };
  
  const badgeConfig = getBadgeConfig();
  return (
    <Card
      variant="interactive"
      padding="none"
      className={cn(
        "overflow-hidden",
        isSelected && "ring-2 ring-[var(--accent-primary)]"
      )}
      onClick={onClick}
    >
      {/* Festival Image/Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Music2 className="h-16 w-16 text-white/30" />
        </div>
        {isSelected && (
          <div className="absolute top-3 right-3">
            <Badge variant={badgeConfig.variant} size="sm">
              <badgeConfig.icon className="h-3 w-3 mr-1 fill-current" />
              {badgeConfig.text}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Content */}
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          {festival.name}
        </h3>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-muted)] mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {festival.year}
          </span>
          {festival.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {festival.location}
            </span>
          )}
        </div>
        
        {festival.description && (
          <p className="text-sm text-[var(--foreground-subtle)] line-clamp-2 mb-4">
            {festival.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            <Music2 className="h-3 w-3 mr-1" />
            {festival.bandCount || 0} bands
          </Badge>
          <ChevronRight className="h-5 w-5 text-[var(--foreground-subtle)]" />
        </div>
      </CardContent>
    </Card>
  );
});
