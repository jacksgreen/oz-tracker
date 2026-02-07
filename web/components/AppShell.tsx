"use client";

import { useState } from "react";
import {
  IoHome,
  IoHomeOutline,
  IoCalendar,
  IoCalendarOutline,
  IoMedical,
  IoMedicalOutline,
  IoPeople,
  IoPeopleOutline,
} from "react-icons/io5";
import { HomeTab } from "./HomeTab";
import { ScheduleTab } from "./ScheduleTab";
import { HealthTab } from "./HealthTab";
import { HouseholdTab } from "./HouseholdTab";

type Tab = "home" | "schedule" | "health" | "household";

const TABS: {
  id: Tab;
  label: string;
  icon: typeof IoHome;
  iconOutline: typeof IoHomeOutline;
}[] = [
  { id: "home", label: "HOME", icon: IoHome, iconOutline: IoHomeOutline },
  {
    id: "schedule",
    label: "SCHEDULE",
    icon: IoCalendar,
    iconOutline: IoCalendarOutline,
  },
  {
    id: "health",
    label: "HEALTH",
    icon: IoMedical,
    iconOutline: IoMedicalOutline,
  },
  {
    id: "household",
    label: "HOUSEHOLD",
    icon: IoPeople,
    iconOutline: IoPeopleOutline,
  },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 border-r border-border bg-white shrink-0 sticky top-0 h-screen">
        <div className="p-6 pb-4 border-b border-border">
          <h1
            className="text-2xl text-ink"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Dog Duty
          </h1>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = isActive ? tab.icon : tab.iconOutline;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer ${
                  isActive
                    ? "bg-cream text-ink"
                    : "text-ink-muted hover:bg-cream/50"
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-medium tracking-[1.2px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto tab-content" key={activeTab}>
          {activeTab === "home" && <HomeTab />}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "health" && <HealthTab />}
          {activeTab === "household" && <HouseholdTab />}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border flex" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = isActive ? tab.icon : tab.iconOutline;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-colors`}
              style={{ paddingTop: "8px", paddingBottom: "4px", color: isActive ? "var(--color-ink)" : "var(--color-ink-faint)" }}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium tracking-[1.2px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
