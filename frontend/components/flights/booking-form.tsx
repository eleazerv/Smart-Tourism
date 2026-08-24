"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";
import { formatIDR } from "@/lib/seeded-random";

/**
 * Contact and passenger details, then a confirmation.
 *
 * Deliberately stops short of payment: this prototype has no booking system
 * behind it, and a form that asked for card details would be pretending to be
 * something it is not. The confirmation says so in as many words.
 */
export function BookingForm({
  passengers,
  total,
  route,
  exploreHref,
  exploreLabel,
}: {
  passengers: number;
  total: number;
  /** e.g. `CGK – DPS`, shown on the confirmation. */
  route: string;
  exploreHref: string;
  exploreLabel: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <Confirmation
        route={route}
        passengers={passengers}
        total={total}
        exploreHref={exploreHref}
        exploreLabel={exploreLabel}
        onReset={() => setSubmitted(false)}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-6"
    >
      <Fieldset
        title="Detail kontak"
        note="E-tiket dan perubahan jadwal dikirim ke kontak ini."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Nama lengkap" name="contact-name" required />
          <TextField
            label="Nomor ponsel"
            name="contact-phone"
            type="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            required
          />
          <div className="sm:col-span-2">
            <TextField
              label="Email"
              name="contact-email"
              type="email"
              placeholder="nama@email.com"
              required
            />
          </div>
        </div>
      </Fieldset>

      <Fieldset
        title={`Data penumpang (${passengers})`}
        note="Nama harus sama persis dengan yang tertera di KTP atau paspor."
      >
        <div className="space-y-4">
          {Array.from({ length: passengers }, (_, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Penumpang {i + 1}
              </p>
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                {/* Age band rather than a salutation: it is what an airline
                    actually needs, and it assumes nothing about the traveller. */}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    Tipe penumpang
                  </span>
                  <select
                    name={`pax-${i}-type`}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/20"
                  >
                    <option>Dewasa (12+)</option>
                    <option>Anak (2–11)</option>
                    <option>Bayi (di bawah 2)</option>
                  </select>
                </label>
                <TextField
                  label="Nama lengkap"
                  name={`pax-${i}-name`}
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </Fieldset>

      <div className="rounded-xl border border-dashed border-border bg-muted/50 p-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Purwarupa ini tidak memproses pembayaran dan tidak menerbitkan tiket.
            Data yang Anda isi hanya tersimpan di browser selama halaman ini
            terbuka dan tidak dikirim ke mana pun.
          </span>
        </p>
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-brand-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
      >
        Lanjutkan &middot; {formatIDR(total)}
      </button>
    </form>
  );
}

function Confirmation({
  route,
  passengers,
  total,
  exploreHref,
  exploreLabel,
  onReset,
}: {
  route: string;
  passengers: number;
  total: number;
  exploreHref: string;
  exploreLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
      <span
        aria-hidden="true"
        className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
      >
        <CheckCircle2 className="h-6 w-6" />
      </span>

      <h2 className="mt-4 font-display text-xl font-bold tracking-tight">
        Pemesanan tersimpan
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {route} &middot; {passengers} penumpang &middot; {formatIDR(total)}
      </p>

      <p
        role="status"
        className="mx-auto mt-4 max-w-md rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground"
      >
        <span className="font-semibold text-foreground">
          Ini hanya purwarupa.
        </span>{" "}
        Tidak ada tiket yang diterbitkan, tidak ada pembayaran yang diproses, dan
        tidak ada data yang dikirim ke maskapai mana pun.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href={exploreHref}
          className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 dark:bg-brand-100 dark:text-brand-900 dark:hover:bg-brand-50"
        >
          {exploreLabel}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:border-brand-700 hover:bg-brand-tint/10 dark:hover:border-brand-100 dark:hover:bg-brand-tint/15"
        >
          Ubah data
        </button>
      </div>
    </div>
  );
}

function Fieldset({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <legend className="px-1 font-display text-base font-bold tracking-tight">
        {title}
      </legend>
      <p className="mb-3.5 text-xs text-muted-foreground">{note}</p>
      {children}
    </fieldset>
  );
}

function TextField({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        {...rest}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus-visible:border-brand-700 focus-visible:ring-2 focus-visible:ring-brand-700/20"
      />
    </label>
  );
}
