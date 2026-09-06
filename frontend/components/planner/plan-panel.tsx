"use client";

/**
 * Panel rencana — sisi "hasil" dari percakapan.
 *
 * Semua endpoint `/api/trips/...` membalas canvas utuh, jadi panel ini tidak
 * pernah menambal state-nya sendiri: setiap aksi mengganti seluruh rencana
 * dengan apa yang baru saja dikonfirmasi server. Itu yang menjaga panel ini
 * dan database tidak pernah berbeda cerita.
 *
 * Rencana disusun PER KOTA. Satu stop = satu kota, dan penginapan serta
 * tanggal menginap menempel di stop itu, bukan di tiap destinasi — semua
 * destinasi di kota yang sama tidur di hotel yang sama pada rentang yang
 * sama. Penerbangan juga per kota: `arrival` menerbangkan masuk, `departure`
 * menerbangkan keluar, jadi perjalanan lima kota wajar punya lebih dari dua
 * leg.
 */

import { useState } from "react";
import {
  BedDouble,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Plane,
  Trash2,
  X,
  CreditCard,
  Ticket,
} from "lucide-react";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FlightPicker } from "@/components/planner/flight-picker";
import { formatIDR } from "@/lib/seeded-random";
import { cn } from "@/lib/utils";
import {
  getDestinationAccommodations,
  type FlightOption,
  type NearbyAccommodation,
  type TripCanvas,
  type TripFlight,
  type TripFlightRole,
  type TripItem,
  type TripStop,
} from "@/lib/api";
import { useLocale, useTranslations } from "next-intl";
import { intlLocale } from "@/lib/intl";

const TIER_LABEL: Record<string, string> = {
  budget: "Hemat",
  mid: "Menengah",
  luxury: "Mewah",
};

export type StopPatch = {
  accommodation_id?: string | null;
  check_in?: string | null;
  check_out?: string | null;
};

type Props = {
  canvas: TripCanvas | null;
  busy: boolean;
  onPatchStop: (stopId: string, patch: StopPatch) => Promise<void>;
  onRemoveStop: (stopId: string) => Promise<void>;
  onPatchItem: (
    itemId: string,
    patch: { status?: "suggested" | "confirmed" },
  ) => Promise<void>;
  onRemoveItem: (itemId: string) => Promise<void>;
  onDropFlight: (stopId: string, role: TripFlightRole) => Promise<void>;
  /** Sama dengan yang dipakai kartu pilihan di chat — satu jalur, satu perilaku. */
  onPickFlight: (
    option: FlightOption,
    stopId: string,
    role: TripFlightRole,
  ) => Promise<void>;
  onCheckout: (passengerNames: string[]) => Promise<void>;
};



/**
 * Label status penginapan, meluruskan kosakata database.
 *
 * `pending` di sana berarti "sudah disetujui pengguna, siap checkout" — bukan
 * "menunggu sesuatu". Nama kolomnya menyesatkan, jadi labelnya di sini yang
 * membetulkan.
 */


function shortDate(value: string | null, locale: string) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(intlLocale(locale), {
    day: "numeric",
    month: "short",
  });
}

/** Nama kota stop ini, atau penanda jujur kalau relasinya kosong. */
function cityName(stop: TripStop, fallback: string) {
  return stop.cities?.name ?? fallback;
}

/**
 * Apa yang akan terjadi kalau tombol checkout ditekan sekarang.
 *
 * Yang ditampilkan bukan daftar kekurangan melainkan ringkasan: ini yang akan
 * dipesan, ini yang tidak ikut, dan tidak ikut itu bukan masalah. Backend
 * tidak pernah mewajibkan penginapan atau penerbangan — ia memesan yang sudah
 * lengkap dan melewati sisanya tanpa mengeluh.
 *
 * Syaratnya disalin dari dokumentasi `POST /api/trips/:id/checkout` dan dari
 * aturan yang dipegang system prompt planner:
 *
 * - penginapan ikut kalau stop-nya punya hotel terpilih, tanggal lengkap,
 *   minimal satu destinasi berstatus `confirmed`, dan statusnya sudah naik
 *   dari `suggested` ke `pending` (artinya pengguna sudah menyetujuinya);
 * - penerbangan ikut kalau legnya sudah `confirmed` dan belum pernah dipesan.
 */
function bookingPlan(canvas: TripCanvas) {
  const stops = canvas.stops ?? [];

  const stays = stops.filter(
    (stop) =>
      stop.accommodations &&
      stop.accommodation_status === "pending" &&
      stop.check_in &&
      stop.check_out &&
      stop.trip_items.some((item) => item.status === "confirmed"),
  );

  const flights = stops.flatMap((stop) =>
    stop.trip_flights
      .filter((flight) => flight.confirmed && !flight.booked_at)
      .map((flight) => ({ stop, flight })),
  );

  const skipped = stops.filter(
    (stop) => !stays.includes(stop) && stop.accommodation_status !== "booked",
  );

  return {
    stays,
    flights,
    skipped,
    alreadyBooked:
      stops.some((stop) => stop.accommodation_status === "booked") ||
      stops.some((stop) => stop.trip_flights.some((f) => f.booked_at)),
  };
}

export function PlanPanel({
  canvas,
  busy,
  onPatchStop,
  onRemoveStop,
  onPatchItem,
  onRemoveItem,
  onDropFlight,
  onPickFlight,
  onCheckout,
}: Props) {
  const t = useTranslations("planner");
  const locale = useLocale();

  // Nama penumpang hanya diminta kalau ada tiket yang benar-benar akan
  // dipesan: backend menolak checkout berisi penerbangan tanpa nama, dan
  // meminta nama untuk pemesanan yang cuma berisi hotel jadi mubazir.
  const [passengers, setPassengers] = useState("");
  const [confirming, setConfirming] = useState(false);
  if (!canvas?.trip) {
    return (
      <p className="p-5 text-sm text-muted-foreground">
        {t("openConversation")}
      </p>
    );
  }

  const { trip } = canvas;
  const stops = canvas.stops ?? [];
  const plan = bookingPlan(canvas);

  const passengerNames = passengers
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const needsPassengers = plan.flights.length > 0;
  const hasSomethingToBook = plan.stays.length > 0 || plan.flights.length > 0;
  const ready =
    hasSomethingToBook && (!needsPassengers || passengerNames.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="font-display text-base font-bold tracking-tight">
          {trip.name ?? t("unnamedTrip")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {shortDate(trip.start_date, locale) ?? t("dateUnknown")} →{" "}
          {shortDate(trip.end_date, locale) ?? "?"} ·{" "}
          {t("travelers", { count: trip.travelers })}
          {trip.cities?.name ? t("fromCity", { city: trip.cities.name }) : ""}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {stops.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("noStops")}
          </p>
        ) : (
          stops.map((stop) => (
            <StopCard
              key={stop.id}
              stop={stop}
              canvas={canvas}
              busy={busy}
              onPatchStop={onPatchStop}
              onRemoveStop={onRemoveStop}
              onPatchItem={onPatchItem}
              onRemoveItem={onRemoveItem}
              onDropFlight={onDropFlight}
              onPickFlight={onPickFlight}
            />
          ))
        )}

        <BookingSummary plan={plan} />
      </div>

      <div className="border-t border-border p-4">
        {needsPassengers && (
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("passengerNames")}
            </span>
            <input
              type="text"
              value={passengers}
              disabled={busy}
              placeholder={t("separateWithCommas")}
              onChange={(e) => setPassengers(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs disabled:opacity-50"
            />
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              {t("passengerNote")}
            </span>
          </label>
        )}

          <Button
            className="w-full rounded-full"
            disabled={!ready || busy}
            onClick={() => setConfirming(true)}   // ← bukan langsung onCheckout
          >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {!hasSomethingToBook
            ? plan.alreadyBooked
              ? t("allBooked")
              : t("nothingBookable")
            : needsPassengers && passengerNames.length === 0
              ? t("fillPassengers")
              : t("bookSummary", { summary: summarise(plan, t) })}
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {t("pendingNote")}
        </p>
      </div>
        <ConfirmDialog
          open={confirming}
          icon={<Ticket className="h-5 w-5" />}
          title="Konfirmasi pesanan"
          description="Periksa sekali lagi sebelum penginapan dan penerbangan ini ditahan atas namamu."
          confirmLabel={busy ? "Memproses..." : "Lanjut ke pembayaran"}
          confirmIcon={<CreditCard className="h-4 w-4" />}
          cancelLabel="Kembali"
          pending={busy}
          footnote="Pembayaran diproses oleh Xendit di halaman terpisah."
          onConfirm={() => {
            onCheckout(passengerNames);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        >
          <BookingSummary plan={plan} />
        </ConfirmDialog>
    </div>
  );
}

/**
 * Satu kota beserta isinya.
 *
 * Urutan bagiannya mengikuti urutan keputusan yang sebenarnya diambil orang:
 * kapan menginap, di mana menginap, naik apa ke sini, lalu ke mana saja
 * selama di kota ini.
 */
function StopCard({
  stop,
  canvas,
  busy,
  onPatchStop,
  onRemoveStop,
  onPatchItem,
  onRemoveItem,
  onDropFlight,
  onPickFlight,
}: {
  stop: TripStop;
  canvas: TripCanvas;
  busy: boolean;
  onPatchStop: Props["onPatchStop"];
  onRemoveStop: Props["onRemoveStop"];
  onPatchItem: Props["onPatchItem"];
  onRemoveItem: Props["onRemoveItem"];
  onDropFlight: Props["onDropFlight"];
  onPickFlight: Props["onPickFlight"];
}) {
  const t = useTranslations("planner");
  const [pending, setPending] = useState(false);
  const stay = stop.accommodations;
  const locked = stop.accommodation_status === "booked";


  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  };

  const frozen = busy || pending;

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <header className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {String(stop.sequence_order).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {cityName(stop, t("unknownCity"))}
          </p>
          {stop.cities?.provinces?.name && (
            <p className="truncate text-xs text-muted-foreground">
              {stop.cities.provinces.name}
            </p>
          )}
        </div>
        {!locked && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 rounded-full px-2 text-destructive hover:text-destructive"
            aria-label={t("removeStop", { city: cityName(stop, t("unknownCity")) })}
            disabled={frozen}
            onClick={() => run(() => onRemoveStop(stop.id))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </header>

      <div className="mt-2.5 flex gap-2">
        <DateInput
          label="Check-in"
          value={stop.check_in}
          disabled={frozen || locked}
          onChange={(v) => run(() => onPatchStop(stop.id, { check_in: v }))}
        />
        <DateInput
          label="Check-out"
          value={stop.check_out}
          disabled={frozen || locked}
          onChange={(v) => run(() => onPatchStop(stop.id, { check_out: v }))}
        />
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>{t("stays")}</SectionTitle>
          <span className="mb-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {t(`stayStatus.${stop.accommodation_status}`)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {stay ? (
            <>
              <span className="font-medium text-foreground">{stay.name}</span> ·{" "}
              {t("perNightPrice", {
                price: formatIDR(stay.price_per_night),
              })}
            </>
          ) : (
            t("noStayPicked")
          )}
        </p>

        {!locked && (
          <StayPicker
            stop={stop}
            selectedId={stay?.id ?? null}
            disabled={frozen}
            onPick={(accommodationId) =>
              run(() =>
                onPatchStop(stop.id, { accommodation_id: accommodationId }),
              )
            }
          />
        )}
      </div>

      <div className="mt-3">
        <SectionTitle>{t("flights")}</SectionTitle>
        <ul className="space-y-1.5">
          {(["arrival", "departure"] as const).map((role) => (
            <FlightRow
              key={role}
              role={role}
              leg={stop.trip_flights.find((f) => f.flight_role === role)}
              busy={frozen}
              onDrop={() => run(() => onDropFlight(stop.id, role))}
            />
          ))}
        </ul>

        <FlightPicker
          canvas={canvas}
          stop={stop}
          disabled={frozen}
          onPick={(option, role) => onPickFlight(option, stop.id, role)}
        />
      </div>

      <div className="mt-3">
        <SectionTitle>{t("destinations")}</SectionTitle>
        {stop.trip_items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("noDestinations")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stop.trip_items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                busy={frozen}
                onPatch={onPatchItem}
                onRemove={onRemoveItem}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function FlightRow({
  role,
  leg,
  busy,
  onDrop,
}: {
  role: TripFlightRole;
  leg: TripFlight | undefined;
  busy: boolean;
  onDrop: () => void;
}) {
  const t = useTranslations("planner");

  if (!leg) {
    return (
      <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Plane className="h-3.5 w-3.5 shrink-0" />
        {t("roleNotPicked", { role: t(`role.${role}`) })}
      </li>
    );
  }

  const option = leg.flight_options;

  return (
    <li className="rounded-xl border border-border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Plane className="h-3.5 w-3.5" />
          {t(`role.${role}`)}
        </span>
        {leg.booked_at ? (
          <span className="rounded-full bg-brand-tint/10 px-2 py-0.5 text-[11px] font-medium text-brand-700">
            {t("itemStatus.booked")}
          </span>
        ) : (
          <span className="text-xs font-medium">
            {option ? formatIDR(option.price) : "—"}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm">
        {option?.airline} {option?.flight_number}
      </p>
      <p className="text-xs text-muted-foreground">
        {option?.departure_time.slice(11, 16)} →{" "}
        {option?.arrival_time.slice(11, 16)}
        {/* Leg yang masih usulan AI tidak ikut checkout. Menyebutnya di sini
            supaya tidak ada yang mengira tiketnya sudah aman. */}
        {!leg.booked_at && !leg.confirmed && t("stillSuggested")}
      </p>
      {!leg.booked_at && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 h-7 rounded-full px-2 text-xs text-destructive hover:text-destructive"
          disabled={busy}
          onClick={onDrop}
        >
          {t("dropChoice")}
        </Button>
      )}
    </li>
  );
}

function ItemRow({
  item,
  busy,
  onPatch,
  onRemove,
}: {
  item: TripItem;
  busy: boolean;
  onPatch: Props["onPatchItem"];
  onRemove: Props["onRemoveItem"];
}) {
  const t = useTranslations("planner");
  const [pending, setPending] = useState(false);
  const locked = item.status === "booked";

  const run = async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  };

  const frozen = busy || pending;

  return (
    <li className="rounded-xl border border-border p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {item.destinations?.name}
          </p>
          {item.destinations?.category && (
            <p className="truncate text-xs text-muted-foreground">
              {item.destinations.category}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {t(`itemStatus.${item.status}`)}
        </span>
      </div>

      {!locked && (
        <div className="mt-2 flex gap-1.5">
          <Button
            size="sm"
            variant={item.status === "confirmed" ? "outline" : "default"}
            className="h-7 flex-1 rounded-full text-xs"
            disabled={frozen}
            onClick={() =>
              run(() =>
                onPatch(item.id, {
                  status:
                    item.status === "confirmed" ? "suggested" : "confirmed",
                }),
              )
            }
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : item.status === "confirmed" ? (
              <>
                <X className="h-3.5 w-3.5" /> {t("cancel")}
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> {t("confirm")}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2 text-destructive hover:text-destructive"
            aria-label={t("removeItem", {
              name: item.destinations?.name ?? t("aDestination"),
            })}
            disabled={frozen}
            onClick={() => run(() => onRemove(item.id))}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/** Label tombol checkout: menyebut apa yang akan dipesan, bukan "checkout". */
function summarise(
  plan: ReturnType<typeof bookingPlan>,
  t: ReturnType<typeof useTranslations<"planner">>,
) {
  const parts: string[] = [];
  if (plan.stays.length) parts.push(t("staysCount", { count: plan.stays.length }));
  if (plan.flights.length)
    parts.push(t("flightsCount", { count: plan.flights.length }));
  return parts.join(" & ");
}

/**
 * Ringkasan apa yang akan dan tidak akan dipesan.
 *
 * Nadanya sengaja netral, bukan peringatan: kota tanpa penginapan itu pilihan
 * yang sah, bukan kesalahan yang perlu diperbaiki. Menyebutnya di sini cuma
 * supaya tidak ada kejutan setelah tombolnya ditekan.
 */
function BookingSummary({ plan }: { plan: ReturnType<typeof bookingPlan> }) {
  const t = useTranslations("planner");
  const bookable = plan.stays.length > 0 || plan.flights.length > 0;

  if (!bookable) {
    return (
      <p className="rounded-2xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">
        {plan.alreadyBooked ? t("alreadyBookedNote") : t("savedAsIsNote")}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border p-3 text-xs leading-relaxed">
      <p className="mb-1.5 font-semibold">{t("willBeBooked")}</p>
      <ul className="space-y-1 text-muted-foreground">
        {plan.flights.map(({ stop, flight }) => (
          <li key={flight.id}>
            {t("flightLine", {
              role: t(`role.${flight.flight_role}`).toLowerCase(),
              city: cityName(stop, t("unknownCity")),
              airline: flight.flight_options?.airline ?? "",
              number: flight.flight_options?.flight_number ?? "",
            })}
          </li>
        ))}
        {plan.stays.map((stop) => (
          <li key={stop.id}>
            {t("stayLine", {
              name: stop.accommodations?.name ?? "",
              city: cityName(stop, t("unknownCity")),
            })}
          </li>
        ))}
      </ul>

      {plan.skipped.length > 0 && (
        <p className="mt-2 text-muted-foreground">
          {t("skippedNote", { count: plan.skipped.length })}
        </p>
      )}
    </div>
  );
}

/**
 * Pemilih penginapan langsung di panel.
 *
 * Daftarnya diambil lewat endpoint accommodations milik salah satu destinasi
 * di stop ini. Destinasi mana pun boleh jadi jangkar: backend menolak
 * penginapan yang kotanya berbeda dari kota stop, jadi semua destinasi di
 * stop yang sama menghasilkan daftar yang sama. Kalau stop-nya belum punya
 * destinasi sama sekali, tidak ada jangkar — dan memang belum ada yang bisa
 * dipilihkan.
 *
 * Dimuat saat dibuka, bukan saat kartunya dirender: rencana berisi delapan
 * kota akan menembak delapan permintaan sekaligus untuk daftar yang mungkin
 * tidak satu pun dibuka.
 */
function StayPicker({
  stop,
  selectedId,
  disabled,
  onPick,
}: {
  stop: TripStop;
  selectedId: string | null;
  disabled: boolean;
  onPick: (accommodationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<NearbyAccommodation[] | null>(null);
  const [failed, setFailed] = useState(false);

  const t = useTranslations("planner");
  const anchor = stop.trip_items[0]?.destinations?.id ?? null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || options || !anchor) return;

    try {
      setFailed(false);
      setOptions(await getDestinationAccommodations(anchor));
    } catch {
      setFailed(true);
    }
  }

  if (!anchor) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {t("addDestinationFirstLong")}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-full rounded-full text-xs"
        disabled={disabled}
        onClick={toggle}
        aria-expanded={open}
      >
        <BedDouble className="h-3.5 w-3.5" />
        {selectedId ? t("changeStay") : t("pickStay")}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border">
          {options === null && !failed && (
            <p className="flex items-center gap-1.5 px-3 py-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("loadingStays")}
            </p>
          )}

          {failed && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {t("stayLoadFailed")}
            </p>
          )}

          {options?.length === 0 && (
            <p className="px-3 py-4 text-xs leading-relaxed text-muted-foreground">
              {t("noStaysIn", { city: cityName(stop, t("unknownCity")) })}
            </p>
          )}

          <ul className="divide-y divide-border">
            {options?.map((option) => {
              const picked = option.id === selectedId;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={disabled || picked}
                    onClick={() => {
                      onPick(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition",
                      picked
                        ? "bg-brand-tint/10"
                        : "hover:bg-brand-tint/10",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {option.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {TIER_LABEL[option.tier] ?? option.tier} ·{" "}
                        {t("perNightPrice", {
                        price: formatIDR(option.price_per_night),
                      })}
                        {option.distance_km != null &&
                          ` · ${option.distance_km} km`}
                      </span>
                    </span>
                    {picked && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DateInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        title={label}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
      />
    </label>
  );
}
