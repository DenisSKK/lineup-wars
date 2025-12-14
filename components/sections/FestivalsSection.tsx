"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Music2, X, Star, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Button, Badge, Input, Skeleton, SkeletonCard, StarRating } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Festival, Band, Lineup, BandRating } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

interface FestivalWithLineup extends Festival {
  lineups?: Array<Lineup & { band: Band }>;
  bandCount?: number;
  _lineupCount?: Array<{ count: number }>;
}

interface FestivalsSectionProps {
  user: User | null;
}

export function FestivalsSection({ user }: FestivalsSectionProps) {
  const [festivals, setFestivals] = useState<FestivalWithLineup[]>([]);
  const [selectedFestivalIds, setSelectedFestivalIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<FestivalWithLineup | null>(null);
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const supabase = createClient();
  
  // Fetch festivals and user selections
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch all festivals with band count
      const { data: festivalsData } = await supabase
        .from("festivals")
        .select(`
          *,
          lineups:lineups(count)
        `)
        .order("year", { ascending: false });
      
      if (festivalsData) {
        const festivalsWithCount: FestivalWithLineup[] = festivalsData.map((f: Festival & { lineups: { count: number }[] }) => ({
          ...f,
          bandCount: f.lineups?.[0]?.count || 0,
          lineups: undefined, // Clear the count-only lineups from the initial fetch
        }));
        setFestivals(festivalsWithCount);
      }
      
      // Fetch user's selected festivals
      if (user) {
        const { data: userFestivals } = await supabase
          .from("user_festivals")
          .select("festival_id")
          .eq("user_id", user.id);
        
        if (userFestivals) {
          setSelectedFestivalIds(new Set(userFestivals.map((uf: { festival_id: string }) => uf.festival_id)));
        }
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [user, supabase]);
  
  // Fetch festival details with bands when selected
  const openFestivalDrawer = useCallback(async (festival: FestivalWithLineup) => {
    setSelectedFestival(festival);
    setIsDrawerOpen(true);
    
    // Fetch lineup with band details
    const { data: lineups } = await supabase
      .from("lineups")
      .select(`
        *,
        band:bands(*)
      `)
      .eq("festival_id", festival.id)
      .order("day_number", { ascending: true });
    
    if (lineups) {
      setSelectedFestival({ ...festival, lineups: lineups as Array<Lineup & { band: Band }> });
    }
    
    // Fetch user ratings for this festival
    if (user) {
      const { data: ratings } = await supabase
        .from("band_ratings")
        .select("band_id, rating")
        .eq("user_id", user.id)
        .eq("festival_id", festival.id);
      
      if (ratings) {
        const ratingsMap = new Map<string, number>();
        ratings.forEach((r: { band_id: string; rating: number }) => {
          ratingsMap.set(r.band_id, r.rating);
        });
        setUserRatings(ratingsMap);
      }
    }
  }, [user, supabase]);
  
  // Rate a band
  const rateBand = async (bandId: string, rating: number) => {
    if (!user || !selectedFestival) return;
    
    // Optimistic update
    const newRatings = new Map(userRatings);
    newRatings.set(bandId, rating);
    setUserRatings(newRatings);
    
    // Upsert rating
    await supabase
      .from("band_ratings")
      .upsert({
        user_id: user.id,
        band_id: bandId,
        festival_id: selectedFestival.id,
        rating,
      }, {
        onConflict: "user_id,band_id,festival_id",
      });
    
    // Select festival if not already selected
    if (!selectedFestivalIds.has(selectedFestival.id)) {
      await supabase
        .from("user_festivals")
        .insert({
          user_id: user.id,
          festival_id: selectedFestival.id,
        });
      
      setSelectedFestivalIds(new Set([...selectedFestivalIds, selectedFestival.id]));
    }
  };
  
  // Filter festivals
  const filteredFestivals = festivals.filter((festival) =>
    festival.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    festival.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  return (
    <section id="festivals" className="py-20 bg-[var(--background)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            Browse Festivals
          </h2>
          <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
            Select festivals and rate bands from their lineups. Your ratings contribute to group rankings.
          </p>
        </motion.div>
        
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto mb-12"
        >
          <Input
            placeholder="Search festivals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-5 w-5" />}
          />
        </motion.div>
        
        {/* Loading State */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredFestivals.length === 0 ? (
          <div className="text-center py-12">
            <Music2 className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
            <p className="text-[var(--foreground-muted)]">
              {searchQuery ? "No festivals match your search" : "No festivals available yet"}
            </p>
          </div>
        ) : (
          /* Festival Grid */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredFestivals.map((festival) => {
              const isSelected = selectedFestivalIds.has(festival.id);
              
              return (
                <motion.div key={festival.id} variants={itemVariants}>
                  <Card
                    variant="interactive"
                    padding="none"
                    className={cn(
                      "overflow-hidden",
                      isSelected && "ring-2 ring-[var(--accent-primary)]"
                    )}
                    onClick={() => openFestivalDrawer(festival)}
                  >
                    {/* Festival Image/Placeholder */}
                    <div className="relative h-48 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music2 className="h-16 w-16 text-white/30" />
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="success" size="sm">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Rating
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
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
      
      {/* Festival Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedFestival && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
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
                      {selectedFestival.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedFestival.year}
                      </span>
                      {selectedFestival.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedFestival.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Drawer Content */}
              <div className="p-6">
                {!user ? (
                  <div className="text-center py-12">
                    <p className="text-[var(--foreground-muted)] mb-4">
                      Sign in to rate bands
                    </p>
                    <Button onClick={() => window.location.href = "/login"}>
                      Sign In
                    </Button>
                  </div>
                ) : !selectedFestival.lineups ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : selectedFestival.lineups.length === 0 ? (
                  <div className="text-center py-12">
                    <Music2 className="h-12 w-12 text-[var(--foreground-subtle)] mx-auto mb-4" />
                    <p className="text-[var(--foreground-muted)]">No bands in lineup yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedFestival.lineups.map((lineup) => {
                      const band = lineup.band;
                      const currentRating = userRatings.get(band.id);
                      
                      return (
                        <Card key={lineup.id} variant="default" padding="md">
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
                                onRatingChange={(rating) => rateBand(band.id, rating)}
                                size="lg"
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
