"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Music, Users, Mail, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "festivals", label: "Festivals", icon: <Music className="h-4 w-4" /> },
  { id: "groups", label: "Groups", icon: <Users className="h-4 w-4" /> },
  { id: "invitations", label: "Invitations", icon: <Mail className="h-4 w-4" /> },
];

interface StickyHeaderProps {
  activeSection?: string;
}

export function StickyHeader({ activeSection: externalActiveSection }: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(externalActiveSection || "home");
  const [user, setUser] = useState<User | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  
  const supabase = createClient();
  
  // Fetch user and pending invitations
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { count } = await supabase
          .from("group_invitations")
          .select("*", { count: "exact", head: true })
          .eq("invited_user_id", user.id)
          .eq("status", "pending");
        
        setPendingInvitations(count || 0);
      }
    };
    
    fetchUser();
    
    // Subscribe to invitation changes
    const channel = supabase
      .channel("header-invitations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_invitations",
        },
        () => {
          fetchUser();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);
  
  // Handle scroll for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Update active section from external prop
  useEffect(() => {
    if (externalActiveSection) {
      setActiveSection(externalActiveSection);
    }
  }, [externalActiveSection]);
  
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsMobileMenuOpen(false);
  }, []);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  
  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button
              onClick={() => scrollToSection("home")}
              className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] hover:text-[var(--accent-primary)] transition-colors"
            >
              <span className="text-2xl">🎸</span>
              <span className="hidden sm:inline">Lineup Wars</span>
            </button>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-[var(--background-secondary)]",
                    activeSection === item.id
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.label}
                    {item.id === "invitations" && pendingInvitations > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-[var(--accent-secondary)] text-white">
                        {pendingInvitations}
                      </span>
                    )}
                  </span>
                  {activeSection === item.id && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent-primary)] rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </nav>
            
            {/* Auth Buttons / Profile */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--foreground-muted)]">
                    {user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[var(--background-secondary)] border-l border-[var(--border)] md:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                  <span className="text-lg font-semibold text-[var(--foreground)]">Menu</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                        activeSection === item.id
                          ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "text-[var(--foreground-muted)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                      {item.id === "invitations" && pendingInvitations > 0 && (
                        <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--accent-secondary)] text-white">
                          {pendingInvitations}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
                
                <div className="p-4 border-t border-[var(--border)] space-y-3">
                  {user ? (
                    <>
                      <p className="text-sm text-[var(--foreground-muted)] truncate">
                        {user.email}
                      </p>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block">
                        <Button variant="secondary" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/signup" className="block">
                        <Button variant="primary" className="w-full">
                          Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook to track active section via IntersectionObserver
export function useActiveSection() {
  const [activeSection, setActiveSection] = useState("home");
  
  const createSectionRef = (sectionId: string) => {
    const { ref } = useInView({
      threshold: 0.3,
      onChange: (inView) => {
        if (inView) {
          setActiveSection(sectionId);
          // Update URL hash without scroll
          window.history.replaceState(null, "", `#${sectionId}`);
        }
      },
    });
    return ref;
  };
  
  return { activeSection, createSectionRef };
}
