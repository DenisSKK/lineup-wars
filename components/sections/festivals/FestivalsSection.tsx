"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui";
import type { Festival, Band, Lineup } from "@/lib/types/database";
import type { User } from "@supabase/supabase-js";

import { FestivalGrid } from "./FestivalGrid";
import { FestivalDetailDrawer } from "./FestivalDetailDrawer";
import type { FestivalWithLineup, FestivalRatingStatus } from "./types";

interface FestivalsSectionProps {
  user: User | null;
}

export function FestivalsSection({ user }: FestivalsSectionProps) {
  const [festivals, setFestivals] = useState<FestivalWithLineup[]>([]);
  const [selectedFestivalIds, setSelectedFestivalIds] = useState<Set<string>>(new Set());
  const [festivalRatingStatus, setFestivalRatingStatus] = useState<Map<string, FestivalRatingStatus>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState<FestivalWithLineup | null>(null);
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);
  
  // Fetch festivals and user selections
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch all festivals with band count in a single optimized query
      const { data: festivalsData } = await supabase
        .from("festivals")
        .select(`
          *,
          lineups:lineups(count)
        `)
        .order("year", { ascending: false });
      
      let festivalsWithCount: FestivalWithLineup[] = [];
      
      if (festivalsData) {
        festivalsWithCount = festivalsData.map((f: Festival & { lineups: { count: number }[] }) => ({
          ...f,
          bandCount: f.lineups?.[0]?.count || 0,
          lineups: undefined,
        }));
        setFestivals(festivalsWithCount);
      }
      
      // Fetch user's selected festivals and rating status only if user is authenticated
      if (user) {
        const { data: userFestivals } = await supabase
          .from("user_festivals")
          .select("festival_id")
          .eq("user_id", user.id);
        
        if (userFestivals) {
          setSelectedFestivalIds(new Set(userFestivals.map((uf: { festival_id: string }) => uf.festival_id)));
        }
        
        // Optimized: Fetch rating status in batched queries instead of N+1
        if (festivalsWithCount.length > 0) {
          // Get all lineup band IDs in one query
          const { data: allLineups } = await supabase
            .from("lineups")
            .select("festival_id, band_id");
          
          // Get all user ratings in one query
          const { data: allRatings } = await supabase
            .from("band_ratings")
            .select("band_id")
            .eq("user_id", user.id);
          
          if (allLineups && allRatings) {
            const ratedBandIds = new Set(allRatings.map(r => r.band_id));
            const festivalBands = new Map<string, string[]>();
            
            // Group bands by festival
            allLineups.forEach(lineup => {
              if (!festivalBands.has(lineup.festival_id)) {
                festivalBands.set(lineup.festival_id, []);
              }
              festivalBands.get(lineup.festival_id)!.push(lineup.band_id);
            });
            
            // Calculate status for each festival
            const statusMap = new Map<string, FestivalRatingStatus>();
            festivalsWithCount.forEach(festival => {
              const bandIds = festivalBands.get(festival.id) || [];
              const ratedCount = bandIds.filter(id => ratedBandIds.has(id)).length;
              const totalBands = bandIds.length;
              
              if (totalBands === 0 || ratedCount === 0) {
                statusMap.set(festival.id, "not-rated");
              } else if (ratedCount < totalBands) {
                statusMap.set(festival.id, "rating");
              } else {
                statusMap.set(festival.id, "rated");
              }
            });
            
            setFestivalRatingStatus(statusMap);
          }
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
        .eq("user_id", user.id);
      
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
  const rateBand = useCallback(async (bandId: string, rating: number) => {
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
        rating,
      }, {
        onConflict: "user_id,band_id",
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
    
    // Update festival rating status
    const { data: festivalBands } = await supabase
      .from("lineups")
      .select("band_id")
      .eq("festival_id", selectedFestival.id);
    
    if (festivalBands && festivalBands.length > 0) {
      const bandIds = festivalBands.map(lb => lb.band_id);
      const { data: ratings } = await supabase
        .from("band_ratings")
        .select("band_id")
        .eq("user_id", user.id)
        .in("band_id", bandIds);
      
      const ratedCount = ratings?.length || 0;
      const totalBands = festivalBands.length;
      
      const newStatus: FestivalRatingStatus = 
        ratedCount === 0 ? "not-rated" : 
        ratedCount < totalBands ? "rating" : "rated";
      
      setFestivalRatingStatus(new Map(festivalRatingStatus.set(selectedFestival.id, newStatus)));
    }
  }, [user, selectedFestival, userRatings, selectedFestivalIds, festivalRatingStatus, supabase]);
  
  // Filter festivals with memoization
  const filteredFestivals = useMemo(() => 
    festivals.filter((festival) =>
      festival.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      festival.location?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [festivals, searchQuery]
  );
  
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
        
        {/* Festival Grid */}
        <FestivalGrid
          festivals={filteredFestivals}
          selectedFestivalIds={selectedFestivalIds}
          festivalRatingStatus={festivalRatingStatus}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onFestivalClick={openFestivalDrawer}
        />
      </div>
      
      {/* Festival Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedFestival && (
          <FestivalDetailDrawer
            festival={selectedFestival}
            userRatings={userRatings}
            isAuthenticated={!!user}
            onRatingChange={rateBand}
            onClose={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
