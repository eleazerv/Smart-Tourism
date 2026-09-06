"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { AccountSection } from "@/components/account/account-section";
import { FlightBookingList } from "@/components/account/flight-booking-list";
import { TripBookingList } from "@/components/account/trip-booking-list";
import { AccommodationBookingList } from "@/components/account/accommodation-booking-list";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "trip", label: "Paket Trip" },
  { key: "flight", label: "Penerbangan" },
  { key: "accommodation", label: "Penginapan" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AccountBookingsPage() {
  const [tab, setTab] = useState<TabKey>("trip");

  return (
    <AccountSection
      title="Pesanan saya"
      description="Semua pesanan Anda — paket trip, tiket pesawat, dan penginapan — beserta status pembayarannya."
    >
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === t.key
                ? "border-brand-700 text-brand-700 dark:border-brand-100 dark:text-brand-100"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
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