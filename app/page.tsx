"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { createClient } from "@/lib/supabase/client";
import { StickyHeader } from "@/components/layout/StickyHeader";
import { 
  HeroSection, 
  FestivalsSection, 
  GroupsSection, 
  InvitationsSection 
} from "@/components/sections";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
  
  const supabase = createClient();
  
  // Intersection observers for each section
  const { ref: homeRef, inView: homeInView } = useInView({ threshold: 0.3 });
  const { ref: festivalsRef, inView: festivalsInView } = useInView({ threshold: 0.3 });
  const { ref: groupsRef, inView: groupsInView } = useInView({ threshold: 0.3 });
  const { ref: invitationsRef, inView: invitationsInView } = useInView({ threshold: 0.3 });
  
  // Update active section based on visibility
  useEffect(() => {
    if (invitationsInView) setActiveSection("invitations");
    else if (groupsInView) setActiveSection("groups");
    else if (festivalsInView) setActiveSection("festivals");
    else if (homeInView) setActiveSection("home");
  }, [homeInView, festivalsInView, groupsInView, invitationsInView]);
  
  // Fetch user on mount
  useEffect(() => {
    const supabaseClient = createClient();
    
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    
    fetchUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // Handle hash navigation on load
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 100);
    }
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--foreground-muted)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <StickyHeader activeSection={activeSection} />
      
      {/* Hero Section */}
      <div ref={homeRef}>
        <HeroSection user={user} />
      </div>
      
      {/* Festivals Section */}
      <div ref={festivalsRef}>
        <FestivalsSection user={user} />
      </div>
      
      {/* Groups Section */}
      <div ref={groupsRef}>
        <GroupsSection user={user} />
      </div>
      
      {/* Invitations Section */}
      <div ref={invitationsRef}>
        <InvitationsSection user={user} />
      </div>
      
      {/* Footer */}
      <footer className="py-12 bg-[var(--background-secondary)] border-t border-[var(--border)]">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[var(--foreground-muted)] mb-2">
            🎸 Lineup Wars - Compare Festival Lineups
          </p>
          <p className="text-sm text-[var(--foreground-subtle)]">
            Currently featuring Rock For People vs Nova Rock 2025
          </p>
        </div>
      </footer>
    </main>
  );
}
