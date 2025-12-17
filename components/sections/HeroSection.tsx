"use client";

import { motion } from "framer-motion";
import { Music, Users, Trophy, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import type { User } from "@supabase/supabase-js";

interface HeroSectionProps {
  user: User | null;
}

const features = [
  {
    icon: <Music className="h-8 w-8" />,
    title: "Rate Bands",
    description: "Score each band from 1-10 across multiple festival lineups",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Create Groups",
    description: "Invite friends and compare your collective ratings",
  },
  {
    icon: <Trophy className="h-8 w-8" />,
    title: "Settle the Debate",
    description: "See which festival has the best lineup based on your group's taste",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

export function HeroSection({ user }: HeroSectionProps) {
  const scrollToSection = (sectionId: string) => {
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
  };
  
  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pb-20 sm:pb-24"
    >
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "var(--gradient-mesh)" }}
      />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-[var(--accent-primary)]/10 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-[var(--accent-secondary)]/10 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              Rock For People vs Nova Rock 2025
            </span>
          </motion.div>
          
          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--foreground)] leading-tight mb-6"
          >
            Rate. Compare.
            <br />
            <span className="gradient-text">Settle the Debate.</span>
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-[var(--foreground-muted)] max-w-2xl mx-auto mb-10"
          >
            Compare festival lineups with friends. Rate bands, create groups, and discover
            which festival truly has the best lineup based on your collective taste.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            {user ? (
              <>
                <Button
                  size="lg"
                  onClick={() => scrollToSection("festivals")}
                  className="w-full sm:w-auto"
                >
                  <Music className="mr-2 h-5 w-5" />
                  Browse Festivals
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => scrollToSection("groups")}
                  className="w-full sm:w-auto"
                >
                  <Users className="mr-2 h-5 w-5" />
                  My Groups
                </Button>
              </>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </motion.div>
          
          {/* Feature Cards */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card
                  variant="glass"
                  padding="lg"
                  className="h-full text-center hover:border-[var(--accent-primary)]/30 transition-colors duration-300"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div
        className="relative mt-12 flex justify-center md:mt-0 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <motion.button
          onClick={() => scrollToSection("festivals")}
          className="flex flex-col items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-sm font-medium">Scroll to explore</span>
          <ChevronDown className="h-5 w-5" />
        </motion.button>
      </motion.div>
    </section>
  );
}
