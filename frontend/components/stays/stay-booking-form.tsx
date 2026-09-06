"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  BedDouble,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { bookStayAndPay } from "@/lib/stay-booking-actions";
import { formatIDR } from "@/lib/seeded-random";
import { formatDateLabel } from "@/lib/stays-search";

/** What the reader is booking, resolved by the page before this renders. */
export type StayBookingSummary = {
  id: string;
  name: string;
  pricePerNight: number;
  /** Per room, not for the whole booking. Null when the row records none. */
  maxGuests: number | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Free rooms across the chosen dates, or null when the check failed. */
  available: number | null;
};

/** The API refuses more than five rooms on one booking. */
const MAX_ROOMS = 5;

/**
 * Room allocation, the price breakdown, and the action that reserves and pays.
 *
 * The total moves with the room count, so the breakdown and the button live
 * together here rather than in the page's sidebar — a total that updates out
 * of view is a total nobody trusts.
 *
 * Rooms are sent as an explicit array rather than a count: how a party splits
 * across rooms is the traveller's call, and the API deliberately never guesses
 * it from the guest total.
 */
export function StayBookingForm({
  stay,
  initialRooms,
  initialGuests,
  today,
  contactName,
  contactEmail,
}: {
  stay: StayBookingSummary;
  initialRooms: number;
  initialGuests: number;
  /** Server's date, passed in so the check never differs across hydration. */
  today: string;
  /** The signed-in reader — the booking is recorded against their account. */
  contactName: string;
  contactEmail: string;
}) {
  // A room cannot be booked past what is free, and never past the API's cap.
  const roomCeiling = Math.max(
    1,
    Math.min(MAX_ROOMS, stay.available ?? MAX_ROOMS),
  );
  const guestCeiling = stay.maxGuests ?? 12;

  const [guestsPerRoom, setGuestsPerRoom] = useState<number[]>(() =>
    spreadGuests(
      Math.min(Math.max(initialRooms, 1), roomCeiling),
      initialGuests,
      guestCeiling,
    ),
  );
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    bookingId?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const roomCount = guestsPerRoom.length;
  const totalGuests = guestsPerRoom.reduce((sum, n) => sum + n, 0);
  const roomTotal = stay.pricePerNight * stay.nights;
  const total = roomTotal * roomCount;

  // Only reasons the reader can actually fix; the API is still the authority.
  const blocker = useMemo(() => {
    // A hand-edited or long-stale link can point at a date already gone. The
    // API refuses it too, but not until after the confirmation dialog.
    if (stay.checkIn < today) {
      return "Tanggal check-in sudah lewat. Pilih tanggal menginap yang baru.";
    }
    if (stay.available !== null && stay.available < roomCount) {
      return `Hanya ${stay.available} kamar yang bebas untuk tanggal ini.`;
    }
    if (stay.maxGuests !== null) {
      const over = guestsPerRoom.findIndex((n) => n > stay.maxGuests!);
      if (over >= 0) {
        return `Kamar ${over + 1} melebihi kapasitas ${stay.maxGuests} tamu.`;
      }
    }
    return null;
  }, [guestsPerRoom, roomCount, stay.available, stay.checkIn, stay.maxGuests, today]);

  const setRoomCount = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), roomCeiling);
    setGuestsPerRoom((current) => {
      if (clamped === current.length) return current;
      if (clamped > current.length) {
        return [
          ...current,
          ...Array.from({ length: clamped - current.length }, () => 1),
        ];
      }
      return current.slice(0, clamped);
    });
    setFailure(null);
  };

  const setGuests = (index: number, next: number) => {
    setGuestsPerRoom((current) =>
      current.map((n, i) =>
        i === index ? Math.min(Math.max(next, 1), guestCeiling) : n,
      ),
    );
    setFailure(null);
  };

  const book = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await bookStayAndPay(
        stay.id,
        guestsPerRoom.map((guests) => ({
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          guests,
        })),
      );

      if (result.ok) {
        // Xendit hosts the invoice, so this leaves the app entirely.
        window.location.assign(result.invoiceUrl);
        return;
      }

      setConfirming(false);
      setFailure(result);
    });
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- rooms --- */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
            <BedDouble className="h-4 w-4 text-brand-700" />
            Kamar
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Jumlah kamar</span>
            <Stepper
              value={roomCount}
              min={1}
              max={roomCeiling}
              label="kamar"
              onChange={setRoomCount}
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {formatDateLabel(stay.checkIn)} – {formatDateLabel(stay.checkOut)}
          {" · "}
          {stay.nights} malam
          {stay.maxGuests !== null && ` · maksimal ${stay.maxGuests} tamu/kamar`}
        </p>

        <ul className="mt-4 space-y-2">
          {guestsPerRoom.map((guests, index) => (
            <li
              key={index}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">Kamar {index + 1}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatIDR(stay.pricePerNight)} × {stay.nights} malam ={" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatIDR(roomTotal)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Users
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
                <Stepper
                  value={guests}
                  min={1}
                  max={guestCeiling}
                  label={`tamu di kamar ${index + 1}`}
                  onChange={(next) => setGuests(index, next)}
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          Total {totalGuests} tamu di {roomCount} kamar. Pembagian tamu per
          kamar mengikuti pilihan Anda, bukan dihitung otomatis.
        </p>
      </section>

      {/* ----------------------------------------------------- contact --- */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
          <UserRound className="h-4 w-4 text-brand-700" />
          Pemesan
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Nama</dt>
            <dd className="font-medium">
              {contactName || (
                <Link
                  href="/akun"
                  className="font-semibold text-brand-700 underline underline-offset-2"
                >
                  Lengkapi nama di profil
                </Link>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{contactEmail}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-snug text-muted-foreground">
          Pesanan dicatat atas akun ini, jadi konfirmasi dan status
          pembayarannya bisa dibuka kembali kapan saja dari halaman Pesanan.
        </p>
      </section>

      {/* ------------------------------------------------------ payment --- */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <h2 className="font-display text-base font-bold tracking-tight">
          Rincian harga
        </h2>

        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">
              {formatIDR(stay.pricePerNight)} × {stay.nights} malam ×{" "}
              {roomCount} kamar
            </dt>
            <dd className="tabular-nums">{formatIDR(total)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Pajak &amp; biaya layanan</dt>
            <dd className="text-xs text-muted-foreground">
              Sudah termasuk harga
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm font-semibold">Total pembayaran</span>
          <span className="font-display text-xl font-bold tabular-nums">
            {formatIDR(total)}
          </span>
        </div>

        {blocker && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {blocker}
          </p>
        )}

        {failure && (
          <div role="alert" className="mt-3 space-y-1.5">
            <p className="text-sm text-destructive">{failure.message}</p>
            {failure.bookingId && (
              <Link
                href={`/akun/pesanan/${failure.bookingId}`}
                className="inline-block text-xs font-semibold text-brand-700 underline underline-offset-2"
              >
                Buka pesanan dan coba bayar lagi
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending || blocker !== null}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {pending ? "Menyiapkan pembayaran..." : "Pesan & bayar"}
        </button>

        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-px h-3.5 w-3.5 shrink-0" />
          Kamar ditahan begitu pesanan dibuat, lalu pembayaran diselesaikan di
          halaman Xendit.
        </p>
      </section>

      <ConfirmDialog
        open={confirming}
        icon={<BedDouble className="h-5 w-5" />}
        title="Pesan kamar ini?"
        description={`${roomCount} kamar di ${stay.name} untuk ${stay.nights} malam, ${formatDateLabel(stay.checkIn)} – ${formatDateLabel(stay.checkOut)}.`}
        confirmLabel={pending ? "Memproses..." : `Bayar ${formatIDR(total)}`}
        confirmIcon={<CreditCard className="h-4 w-4" />}
        cancelLabel="Periksa lagi"
        pending={pending}
        footnote="Kamar ditahan atas nama Anda begitu pesanan dibuat. Pembayaran diproses oleh Xendit di halaman terpisah."
        onConfirm={book}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/**
 * Seeds the room list from the search: the party spread as evenly as the room
 * capacity allows, so the common case needs no adjusting at all.
 */
function spreadGuests(
  rooms: number,
  guests: number,
  perRoomCap: number,
): number[] {
  const base = Math.min(Math.max(Math.floor(guests / rooms), 1), perRoomCap);
  const seats = Array.from({ length: rooms }, () => base);

  // Hand out whatever the even split left over, one guest at a time, so no
  // room is pushed past its capacity.
  let remainder = Math.min(guests, rooms * perRoomCap) - base * rooms;
  for (let i = 0; remainder > 0 && i < seats.length; i += 1) {
    if (seats[i] >= perRoomCap) continue;
    seats[i] += 1;
    remainder -= 1;
  }
  return seats;
}

function Stepper({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  /** Read into the buttons' accessible names — "Tambah kamar". */
  label: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-0.5">
      <StepButton
        label={`Kurangi ${label}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </StepButton>
      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <StepButton
        label={`Tambah ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full text-foreground transition hover:bg-brand-tint/10 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
