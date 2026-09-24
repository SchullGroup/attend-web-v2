"use client";
import { useState } from "react";
import { useGetSavedEvents } from "@/api/events/hooks";
import { PanelShell, PanelEmpty, PanelSkeleton } from "./PanelShell";
import { EventRowList } from "./EventRowList";
import { EVENT_TABS, type EventTab, filterEventsByTab } from "./eventTabs";

export function SavedEventsPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<EventTab>("All");
  const { data, isLoading } = useGetSavedEvents();
  // A bookmark isn't tied to whether the event is still upcoming — see eventTabs.ts.
  const events = filterEventsByTab(data?.data?.events ?? [], tab, { includeEnded: true });

  return (
    <PanelShell
      title="Saved Events"
      onBack={onBack}
      tabs={EVENT_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as EventTab)}
    >
      {isLoading ? (
        <PanelSkeleton />
      ) : events.length === 0 ? (
        <PanelEmpty>
          Nothing saved here yet — tap the bookmark on any event to save it.
        </PanelEmpty>
      ) : (
        <EventRowList events={events} trailing="bookmark" />
      )}
    </PanelShell>
  );
}
