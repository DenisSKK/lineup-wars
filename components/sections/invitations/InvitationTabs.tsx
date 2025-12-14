"use client";

import { Clock, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType } from "./types";

interface Tab {
  id: TabType;
  label: string;
  count: number;
  icon: React.ReactNode;
}

interface InvitationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingCount: number;
  declinedCount: number;
  requestsCount: number;
}

export function InvitationTabs({
  activeTab,
  onTabChange,
  pendingCount,
  declinedCount,
  requestsCount,
}: InvitationTabsProps) {
  const tabs: Tab[] = [
    { 
      id: "pending", 
      label: "Pending", 
      count: pendingCount,
      icon: <Clock className="h-4 w-4" />,
    },
    { 
      id: "declined", 
      label: "Declined", 
      count: declinedCount,
      icon: <X className="h-4 w-4" />,
    },
    { 
      id: "requests", 
      label: "Join Requests", 
      count: requestsCount,
      icon: <UserPlus className="h-4 w-4" />,
    },
  ];

  return (
    <div className="inline-flex bg-[var(--background-secondary)] rounded-xl p-1 border border-[var(--border)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === tab.id
              ? "text-[var(--foreground)] bg-[var(--background-tertiary)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count > 0 && (
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded-full",
              activeTab === tab.id
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--background-tertiary)] text-[var(--foreground-muted)]"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
