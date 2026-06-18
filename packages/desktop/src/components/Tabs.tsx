import React from "react";
import { useState, type ReactNode } from "react";
import { cn } from "../lib/utils";

interface TabsProps {
  children: ReactNode;
  defaultValue: string;
}
interface TabListProps {
  children: ReactNode;
  className?: string;
}
interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}
interface TabPanelProps {
  value: string;
  children: ReactNode;
}

const TabsContext = React.createContext<{ activeTab: string; setActiveTab: (v: string) => void } | null>(null);

export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function TabList({ children, className = "" }: TabListProps) {
  return (
    <div className={cn("flex gap-0.5 p-1 mx-4 mt-2 rounded-xl glass-card", className)}>
      {children}
    </div>
  );
}

export function Tab({ value, children, disabled = false }: TabProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("Tab must be used within Tabs");
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative",
        isActive
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
        disabled && "opacity-40 cursor-not-allowed"
      )}
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: TabPanelProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabPanel must be used within Tabs");
  const { activeTab } = context;
  if (activeTab !== value) return null;
  return (
    <div role="tabpanel" id={`panel-${value}`} tabIndex={0} className="flex-1 overflow-auto p-4">
      {children}
    </div>
  );
}
