import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, ChevronRight, MapPinned, Sun } from "lucide-react";
import type { ProvinceRef } from "@/lib/api";
import { photo } from "@/lib/home-data";
import { isDrySeason, timingHref, type TimingState } from "@/lib/recommendations-data";
import { monthName, monthNames } from "@/lib/intl";
import { cn } from "@/lib/utils";

/**
 * Page head: what month is being answered for, and the twelve links that
 * change it. Every control is a plain `Link`, so the whole page stays
 * server-rendered and a chosen month is shareable.
 */
export function TimingHero({
  state,
  dryCount,
  provinceCount,
  province,
  season,
}: {
  state: TimingState;
  /** Provinces in the dry season this month. */
  dryCount: number;
  provinceCount: number;
  /** Set when the reader has narrowed to one province. */
  province: ProvinceRef | null;
  /** That province's season — "34 dari 38" says nothing when the set is one. */
  season: string | null;
}) {
  const t = useTranslations("timing");
  const locale = useLocale();
  const name = monthName(state.month, locale);

  return (
    <section className="relative isolate overflow-hidden bg-brand-900">
      <Image
        src={photo(`season-${state.month}`, 1600, 700)}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/85 to-brand-900/55"
      />

      <div className="container-page relative py-8 sm:py-12">
        <nav aria-label="Remah roti">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-brand-100/80">
            <li>
              <Link
                href="/"
                className="underline-offset-2 transition hover:text-white hover:underline"
              >
                {t("home")}
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-brand-100">{t("crumb")}</span>
            </li>
          </ol>
        </nav>

        <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {province
            ? t("titleProvince", { province: province.name })
            : t("titleMonth", { month: name })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-100/90">
          {t("subtitle")}
        </p>

        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-brand-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <dt className="sr-only">{t("month")}</dt>
            <dd className="text-sm font-semibold">{name}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0" />
            <dt className="sr-only">{t("season")}</dt>
            <dd className="text-sm font-semibold">
              {province
                ? season
                  ? isDrySeason(season)
                    ? t("seasonDry")
                    : t("seasonWet")
                  : t("seasonUnknown")
                : t("dryCount", { dry: dryCount, total: provinceCount })}
            </dd>
          </div>
          {province && (
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 shrink-0" />
              <dt className="sr-only">{t("provinceFilter")}</dt>
              <dd>
                <Link
                  href={timingHref(state, { provinceId: null })}
                  className="text-sm font-semibold underline underline-offset-4 transition hover:text-white"
                >
                  {t("seeAllProvinces")}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container-page">
          <div
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0"
            role="group"
            aria-label={t("pickMonth")}
          >
            {/* Penanda bulan kemarau sengaja tidak dipasang di sini: panel
                provinsi di bawah sudah menggambarkannya sebagai strip dua
                belas bulan berikut legendanya. Ini cukup jadi pemindah bulan
                saja. */}
            {monthNames(locale).map((label, index) => {
              const month = index + 1;
              const current = month === state.month;
              return (
                <Link
                  key={label}
                  href={timingHref(state, { month })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                    current
                      ? "bg-brand-100 text-brand-900"
                      : "text-brand-100/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
