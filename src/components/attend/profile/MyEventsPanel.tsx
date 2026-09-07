"use client";
import { useState } from "react";
import { useGetMyEvents } from "@/api/events/hooks";
import { PanelShell, PanelEmpty, PanelSkeleton } from "./PanelShell";
import { EventRowList } from "./EventRowList";
import { EVENT_TABS, type EventTab, filterEventsByTab } from "./eventTabs";

export function MyEventsPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<EventTab>("All");
  const { data, isLoading } = useGetMyEvents();
  const events = filterEventsByTab(data?.data?.events ?? [], tab);

  return (
    <PanelShell
      title="My Events"
      onBack={onBack}
      tabs={EVENT_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as EventTab)}
    >
      {isLoading ? (
        <PanelSkeleton />
      ) : events.length === 0 ? (
        <PanelEmpty>
          {tab === "Attended"
            ? "No past events yet — events you attend will be listed here."
            : tab === "Challenges"
              ? "You haven't joined any challenges yet."
              : "You haven't RSVP'd to anything yet. Browse events to get started."}
        </PanelEmpty>
      ) : (
        <EventRowList events={events} />
      )}
    </PanelShell>
  );
}
