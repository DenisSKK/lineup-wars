"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, X, Music2, Star } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { BandRatingCard } from "./BandRatingCard";
import { RatingStatistics } from "./RatingStatistics";
import type { FestivalWithLineup } from "./types";

interface FestivalDetailDrawerProps {
  festival: FestivalWithLineup;
  userRatings: Map<string, number>;
  isAuthenticated: boolean;
  onRatingChange: (bandId: string, rating: number) => void;
  onClose: () => void;
}

export function FestivalDetailDrawer({
  festival,
  userRatings,
  isAuthenticated,
  onRatingChange,
  onClose,
}: FestivalDetailDrawerProps) {
  const [showUnratedOnly, setShowUnratedOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Filter user ratings to only include bands in this festival's lineup
  const festivalUserRatings = useMemo(() => {
    if (!festival.lineups) return new Map<string, number>();
    
    const festivalBandIds = new Set(festival.lineups.map(lineup => lineup.band.id));
    const filteredRatings = new Map<string, number>();
    
    userRatings.forEach((rating, bandId) => {
      if (festivalBandIds.has(bandId)) {
        filteredRatings.set(bandId, rating);
      }
    });
    
    return filteredRatings;
  }, [festival.lineups, userRatings]);

  // Get unique performance dates
  const performanceDates = useMemo(() => {
    if (!festival.lineups) return [];
    const dates = new Set<string>();
    festival.lineups.forEach(lineup => {
      if (lineup.performance_date) {
        dates.add(lineup.performance_date);
      }
    });
    return Array.from(dates).sort();
  }, [festival.lineups]);

  // Filter and sort lineups
  const filteredLineups = useMemo(() => {
    if (!festival.lineups) return [];
    
    let filtered = [...festival.lineups];
    
    // Filter by rating status
    if (showUnratedOnly) {
      filtered = filtered.filter(lineup => !userRatings.has(lineup.band.id));
    }
    
    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(lineup => lineup.performance_date === selectedDate);
    }
    
    // Sort by popularity
    return filtered.sort((a, b) => {
      const popularityA = a.band.spotify_popularity ?? -1;
      const popularityB = b.band.spotify_popularity ?? -1;
      return popularityB - popularityA;
    });
  }, [festival.lineups, showUnratedOnly, selectedDate, userRatings]);
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      />
      
      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl bg-[var(--background-secondary)] border-l border-[var(--border)] overflow-y-auto"
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-[var(--background-secondary)]/95 backdrop-blur-sm border-b border-[var(--border)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[var(--foreground)]">
                {festival.name}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-[var(--foreground-muted)]">
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
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Filters */}
          {isAuthenticated && festival.lineups && festival.lineups.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Unrated Filter */}
              <button
                onClick={() => setShowUnratedOnly(!showUnratedOnly)}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 ${
                  showUnratedOnly
                    ? 'bg-[var(--accent-warning)]/20 border-[var(--accent-warning)] text-[var(--accent-warning)] shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                    : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <Star className={`w-4 h-4 ${showUnratedOnly ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">
                  {showUnratedOnly ? 'Showing Unrated Only' : 'Show Unrated Only'}
                </span>
              </button>

              {/* Date Filter */}
              {performanceDates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDate(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedDate === null
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                    }`}
                  >
                    All Days
                  </button>
                  {performanceDates.map(date => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedDate === date
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              )}

              {/* Results count */}
              <div className="text-xs text-[var(--foreground-muted)] text-center">
                Showing {filteredLineups.length} of {festival.lineups.length} bands
              </div>
            </div>
          )}
        </div>
        
        {/* Drawer Content */}
        <div className="p-6 px-1.5 sm:px-6">
          {/* Rating Statistics */}
          {isAuthenticated && festivalUserRatings.size > 0 && festival.lineups && (
            <RatingStatistics 
              userRatings={festivalUserRatings}
              totalBands={festival.lineups.length}
            />
          )}
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <p className="text-[var(--foreground-muted)] mb-4">
                Sign in to rate bands
              </p>
              <Button onClick={() => window.location.href = "/login"}>
                Sign In
              </Button>
            </div>
          ) : !festival.lineups ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : festival.lineups.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-4" />
              <p className="text-[var(--foreground-muted)]">No bands in lineup yet</p>
            </div>
          ) : filteredLineups.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-4" />
              <p className="text-[var(--foreground-muted)]">No bands match the selected filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLineups.map((lineup) => (
                <BandRatingCard
                  key={lineup.id}
                  lineup={lineup}
                  currentRating={userRatings.get(lineup.band.id)}
                  onRatingChange={onRatingChange}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
