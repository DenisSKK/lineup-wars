"use client";

import { useState } from "react";
import { Card, Badge, StarRating } from "@/components/ui";
import type { Band, Lineup } from "@/lib/types/database";
import { Music } from "lucide-react";

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
  const [showSpotify, setShowSpotify] = useState(false);

  return (
    <Card variant="default" padding="md">
      <div className="flex flex-col gap-4">
        {/* Main Content Row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Band Image */}
          {band.spotify_image_url && (
            <div className="flex-shrink-0">
              <img
                src={band.spotify_image_url}
                alt={band.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Band Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-[var(--foreground)] text-lg">
                  {band.name}
                </h4>
                
                {/* Spotify Link & Popularity */}
                <div className="flex items-center gap-2 mt-1">
                  {band.spotify_url && (
                    <a
                      href={band.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1DB954] hover:underline text-sm flex items-center gap-1"
                    >
                      <Music className="w-3 h-3" />
                      Spotify
                    </a>
                  )}
                  {band.spotify_popularity !== undefined && band.spotify_popularity !== null && (
                    <Badge 
                      variant={
                        band.spotify_popularity >= 70 ? "default" : 
                        band.spotify_popularity >= 40 ? "outline" : 
                        "outline"
                      }
                      size="sm"
                    >
                      {band.spotify_popularity}% popularity
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Genres & Lineup Info */}
            <div className="flex flex-wrap gap-2 mt-2">
              {/* Spotify Genres */}
              {band.spotify_genres && band.spotify_genres.length > 0 && (
                <>
                  {band.spotify_genres.slice(0, 3).map((genre) => (
                    <Badge key={genre} variant="default" size="sm">
                      {genre}
                    </Badge>
                  ))}
                </>
              )}
              
              {/* Fallback to old genre field if no Spotify genres */}
              {(!band.spotify_genres || band.spotify_genres.length === 0) && band.genre && (
                <Badge variant="default" size="sm">{band.genre}</Badge>
              )}
              
              {band.country && (
                <Badge variant="outline" size="sm">🌍 {band.country}</Badge>
              )}
              {lineup.day_number && (
                <Badge variant="outline" size="sm">
                  📅 Day {lineup.day_number}
                </Badge>
              )}
              {lineup.stage && (
                <Badge variant="outline" size="sm">
                  🎪 {lineup.stage}
                </Badge>
              )}
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex flex-col items-end gap-2">
            <StarRating
              rating={currentRating || null}
              onRatingChange={(rating) => onRatingChange(band.id, rating)}
              size="lg"
            />
            
            {/* Show Spotify Player Button */}
            {band.spotify_id && (
              <button
                onClick={() => setShowSpotify(!showSpotify)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                {showSpotify ? "Hide songs" : "Preview songs"}
              </button>
            )}
          </div>
        </div>

        {/* Spotify Embed Player */}
        {showSpotify && band.spotify_id && (
          <div className="mt-2">
            <iframe
              src={`https://open.spotify.com/embed/artist/${band.spotify_id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
              title={`Spotify player for ${band.name}`}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Note: Some artists may restrict playback in embedded players. 
              <a 
                href={band.spotify_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#1DB954] hover:underline ml-1"
              >
                Open in Spotify
              </a>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
