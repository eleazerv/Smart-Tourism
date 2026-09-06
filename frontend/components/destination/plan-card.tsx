"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Eye, MapPin, MessageSquarePlus, Users } from "lucide-react";
import type { DestinationDetail } from "@/lib/api";
import { Rating } from "@/components/home/rating";
import {
  MONTHS,
  formatCount,
  mapsUrl,
  // ratingLabel, frontend-lele
  type CrowdLevel,
} from "@/lib/destination-data";
import { cn } from "@/lib/utils";

const TONE: Record<CrowdLevel["tone"], { bar: string; text: string }> = {
  quiet: { bar: "bg-emerald-500", text: "text-emerald-700" },
  moderate: { bar: "bg-amber-500", text: "text-amber-700" },
  busy: { bar: "bg-rose-500", text: "text-rose-700" },
};

/**
 * The booking-panel slot. There is nothing to sell here, so it plans a visit
 * instead: pick a month, see whether the season suits this destination, and how
 * busy its province has been running.
 */
export function PlanCard({
  destination,
  crowd,
  bestMonths,
}: {
  destination: DestinationDetail;
  /** Null when the province has no row in the latest visitor statistics. */
  crowd: CrowdLevel | null;
  /** 1–12, months whose seasonal recommendation includes this destination. */
  bestMonths: number[];
}) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const suits = bestMonths.includes(month);
  const place = [destination.cities?.name, destination.provinces?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            {destination.avg_rating?.toFixed(1).replace(".", ",") ?? "—"}
            <span className="text-base font-medium text-muted-foreground">
              /5
            </span>
          </p>
          {/* <p className="text-xs text-muted-foreground"> frontend-lele
            {destination.avg_rating !== null
              ? `${ratingLabel(destination.avg_rating)} menurut pengunjung`
              : "Belum ada penilaian"}
          </p> */}
        </div>
        {destination.avg_rating !== null && (
          <Rating value={destination.avg_rating} className="shrink-0" />
        )}
      </div>

      <hr className="my-4 border-border" />

      <label
        htmlFor="plan-month"
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <CalendarDays className="h-4 w-4" />
        Rencana kunjungan
      </label>
      <select
        id="plan-month"
        value={month}
        onChange={(event) => setMonth(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>

      <p
        className={cn(
          "mt-2 rounded-xl px-3 py-2 text-xs",
          bestMonths.length === 0
            ? "bg-muted text-muted-foreground"
            : suits
              ? "bg-brand-tint/10 text-brand-900"
              : "bg-muted text-muted-foreground",
        )}
      >
        {bestMonths.length === 0
          ? "Data musim untuk daerah ini belum tersedia."
          : suits
            ? `${MONTHS[month - 1]} termasuk bulan yang direkomendasikan untuk destinasi ini.`
            : `${MONTHS[month - 1]} bukan bulan rekomendasi — lihat bulan terbaiknya di bawah.`}
      </p>

      {crowd && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Kepadatan provinsi
            </span>
            <span className={cn("font-semibold", TONE[crowd.tone].text)}>
              {crowd.label}
            </span>
          </div>
          <div
            role="meter"
            aria-valuenow={crowd.share}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kepadatan dibanding provinsi terpadat"
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full", TONE[crowd.tone].bar)}
              style={{ width: `${crowd.share}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {crowd.description}
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2">
        <Link
          href={`/recommendations?month=${month}${
            destination.province_id ? `&province_id=${destination.province_id}` : ""
          }`}
          className="block rounded-full bg-brand-700 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-900"
        >
          Lihat rekomendasi {MONTHS[month - 1]}
        </Link>
        <a
          href="#ulasan"
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-brand-tint/10"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Tulis ulasan
        </a>
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
        {place && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Lokasi</dt>
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <dd>
              <a
                href={mapsUrl(destination)}
                target="_blank"
                rel="noreferrer noopener"
                className="underline-offset-2 hover:underline"
              >
                {place}
              </a>
            </dd>
          </div>
        )}
        <div className="flex items-start gap-2">
          <dt className="sr-only">Jumlah dilihat</dt>
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <dd className="text-muted-foreground">
            {formatCount(destination.view_count)} kali dilihat
          </dd>
        </div>
      </dl>
    </div>
  );
}
