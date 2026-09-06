"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Eye, MapPin, MessageSquarePlus, Users } from "lucide-react";
import type { DestinationDetail } from "@/lib/api";
import { Rating } from "@/components/home/rating";
import {
  formatCount,
  mapsUrl,
  type CrowdLevel,
} from "@/lib/destination-data";
import { monthName, monthNames } from "@/lib/intl";
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
  const t = useTranslations("destination");
  const crowdCopy = useTranslations("crowd");
  const locale = useLocale();

  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const suits = bestMonths.includes(month);
  const chosen = monthName(month, locale);
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
        {t("planHeading")}
      </label>
      <select
        id="plan-month"
        value={month}
        onChange={(event) => setMonth(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
      >
        {monthNames(locale).map((name, i) => (
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
          ? t("planNoSeason")
          : suits
            ? t("planSuits", { month: chosen })
            : t("planUnsuits", { month: chosen })}
      </p>

      {crowd && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t("provinceCrowd")}
            </span>
            <span className={cn("font-semibold", TONE[crowd.tone].text)}>
              {crowdCopy(crowd.tone)}
            </span>
          </div>
          <div
            role="meter"
            aria-valuenow={crowd.share}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("crowdMeter")}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn("h-full rounded-full", TONE[crowd.tone].bar)}
              style={{ width: `${crowd.share}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {crowdCopy(`${crowd.tone}Description`, {
              province: crowd.provinceName,
            })}
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
          {t("seeRecommendations", { month: chosen })}
        </Link>
        <a
          href="#ulasan"
          className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-brand-tint/10"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t("writeReview")}
        </a>
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
        {place && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">{t("location")}</dt>
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
          <dt className="sr-only">{t("views")}</dt>
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <dd className="text-muted-foreground">
            {t("viewCount", {
              count: formatCount(destination.view_count, locale),
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
