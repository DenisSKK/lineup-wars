"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, X, Music2 } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { BandRatingCard } from "./BandRatingCard";
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
        </div>
        
        {/* Drawer Content */}
        <div className="p-6 px-1.5 sm:px-6">
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
          ) : (
            <div className="space-y-4">
              {festival.lineups.map((lineup) => (
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
