"use client";

import { useState } from "react";
import { AccountSection } from "@/components/account/account-section";
import { FlightBookingList } from "@/components/account/flight-booking-list";
import { TripBookingList } from "@/components/account/trip-booking-list";
import { AccommodationBookingList } from "@/components/account/accommodation-booking-list";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";


const TABS = ["trip", "flight", "accommodation"] as const;

type TabKey = (typeof TABS)[number];

export default function AccountBookingsPage() {
  const copy = useTranslations("bookings");
  const [tab, setTab] = useState<TabKey>("trip");

  return (
    <AccountSection
      title={copy("heading")}
      description={copy("description")}
    >
      <div className="flex gap-1 border-b border-border">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === key
                ? "border-brand-700 text-brand-700 dark:border-brand-100 dark:text-brand-100"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {copy(`tab${key[0].toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "trip" && <TripBookingList />}
        {tab === "flight" && <FlightBookingList />}
        {tab === "accommodation" && <AccommodationBookingList />}
      </div>
    </AccountSection>
  );
}