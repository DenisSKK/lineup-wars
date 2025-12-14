"use client";

import { motion } from "framer-motion";
import { Music2 } from "lucide-react";
import { SkeletonCard } from "@/components/ui";
import { FestivalCard } from "./FestivalCard";
import type { FestivalWithLineup } from "./types";

interface FestivalGridProps {
  festivals: FestivalWithLineup[];
  selectedFestivalIds: Set<string>;
  isLoading: boolean;
  searchQuery: string;
  onFestivalClick: (festival: FestivalWithLineup) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function FestivalGrid({
  festivals,
  selectedFestivalIds,
  isLoading,
  searchQuery,
  onFestivalClick,
}: FestivalGridProps) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (festivals.length === 0) {
    return (
      <div className="text-center py-12">
        <Music2 className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
        <p className="text-[var(--foreground-muted)]">
          {searchQuery ? "No festivals match your search" : "No festivals available yet"}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {festivals.map((festival) => (
        <FestivalCard
          key={festival.id}
          festival={festival}
          isSelected={selectedFestivalIds.has(festival.id)}
          onClick={() => onFestivalClick(festival)}
        />
      ))}
    </motion.div>
  );
}
