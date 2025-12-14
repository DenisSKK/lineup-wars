"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingProps {
  rating: number | null;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = "md",
  showValue = false 
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };
  
  const starSize = sizes[size];
  
  // Convert 1-10 rating to 0.5-5 stars
  const stars = rating ? rating / 2 : 0;
  const displayRating = hoveredRating !== null ? hoveredRating : rating;
  
  const handleStarClick = (starIndex: number) => {
    if (readonly || !onRatingChange) return;
    
    // starIndex goes from 0.5, 1, 1.5, 2, ... 5
    // Convert back to 1-10 scale
    const newRating = starIndex * 2;
    onRatingChange(newRating);
  };
  
  const renderStar = (index: number) => {
    const starValue = index + 1; // 1, 2, 3, 4, 5
    const halfStarValue = starValue - 0.5; // 0.5, 1.5, 2.5, 3.5, 4.5
    
    const displayStars = displayRating ? displayRating / 2 : 0;
    const isFilled = displayStars >= starValue;
    const isPartiallyFilled = displayStars > (starValue - 1) && displayStars < starValue;
    
    // Calculate precise fill percentage for the current star
    const fillPercentage = isPartiallyFilled 
      ? ((displayStars - (starValue - 1)) * 100)
      : isFilled ? 100 : 0;
    
    return (
      <div key={index} className="relative inline-block">
        {/* Half star button (clickable if not readonly) */}
        {!readonly && (
          <button
            onClick={() => handleStarClick(halfStarValue)}
            onMouseEnter={() => setHoveredRating(halfStarValue * 2)}
            onMouseLeave={() => setHoveredRating(null)}
            className={cn(
              "absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer",
              "hover:opacity-80 transition-opacity"
            )}
            aria-label={`Rate ${halfStarValue * 2}/10`}
          />
        )}
        
        {/* Full star button (clickable if not readonly) */}
        {!readonly && (
          <button
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => setHoveredRating(starValue * 2)}
            onMouseLeave={() => setHoveredRating(null)}
            className={cn(
              "absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer",
              "hover:opacity-80 transition-opacity"
            )}
            aria-label={`Rate ${starValue * 2}/10`}
          />
        )}
        
        {/* Background star (empty) */}
        <Star
          className={cn(
            starSize,
            "text-[var(--border)]",
            !readonly && "cursor-pointer"
          )}
        />
        
        {/* Filled star overlay with precise percentage */}
        {fillPercentage > 0 && (
          <div
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <Star
              className={cn(
                starSize,
                "fill-[var(--accent-warning)] text-[var(--accent-warning)]"
              )}
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map((index) => renderStar(index))}
      </div>
      {showValue && rating !== null && (
        <span className="text-sm text-[var(--foreground-muted)] ml-1">
          ({rating}/10)
        </span>
      )}
    </div>
  );
}

interface StarRatingDisplayProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRatingDisplay({ rating, size = "sm", showValue = true }: StarRatingDisplayProps) {
  return <StarRating rating={rating} readonly size={size} showValue={showValue} />;
}
