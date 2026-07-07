"use client";

import { cn } from "@/lib/utils";

type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
};

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabsProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="tablist" aria-label="Sections">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={cn(
              "min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "bg-primary text-white"
                : "border border-border text-text-secondary hover:bg-surface-raised hover:text-foreground",
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = {
  id: string;
  labelledBy: string;
  hidden?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function TabPanel({ id, labelledBy, hidden = false, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      hidden={hidden}
      className={cn(hidden && "hidden", className)}
    >
      {children}
    </div>
  );
}
