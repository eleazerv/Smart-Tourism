"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, MapPin } from "lucide-react";
import type { Tag } from "@/lib/api";
import {
  MIN_INTERESTS,
  NAME_MAX,
  NAME_MIN,
  TRAVEL_PARTIES,
  type TravelProfile,
} from "@/lib/onboarding";
import { completeOnboarding, skipOnboarding } from "@/app/onboarding/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/home/logo";
import { InterestTiles } from "@/components/onboarding/interest-tiles";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Kenalan dulu",
    subtitle: "Dua isian saja — sisanya bisa dilengkapi kapan-kapan.",
  },
  {
    title: "Liburan seperti apa yang Anda suka?",
    subtitle: `Pilih minimal ${MIN_INTERESTS} tema. Rekomendasi di beranda mengikuti pilihan ini.`,
  },
  {
    title: "Selamat datang di Jelantara",
    subtitle: "Empat menu yang akan paling sering Anda pakai.",
  },
] as const;

const LAST = STEPS.length - 1;

export function OnboardingWizard({
  initialName,
  initialTravel,
  allTags,
  selectedTagIds,
  cities,
}: {
  initialName: string;
  initialTravel: TravelProfile;
  allTags: Tag[];
  selectedTagIds: string[];
  cities: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(initialName);
  const [homeCity, setHomeCity] = useState(initialTravel.home_city ?? "");
  const [party, setParty] = useState<string>(initialTravel.party ?? "");
  const [tagIds, setTagIds] = useState<Set<string>>(
    () => new Set(selectedTagIds),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmedName = fullName.trim();
  const nameValid =
    trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;

  // Katalog tema bisa saja lebih pendek dari ambang batasnya; jangan sampai
  // langkah minat jadi mustahil dilewati karena itu.
  const needed = Math.min(MIN_INTERESTS, allTags.length);
  const remaining = Math.max(0, needed - tagIds.size);

  const canContinue = step === 0 ? nameValid : step === 1 ? remaining === 0 : true;

  const toggleTag = (id: string) => {
    setTagIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Keluar dari wizard: pindah halaman lalu buang cache router, karena setiap
   * halaman dirender ulang dari cookie sesi yang baru saja berubah.
   */
  const leave = () => {
    router.push("/");
    router.refresh();
  };

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Gagal menyimpan. Coba lagi.");
        return;
      }
      leave();
    });
  };

  const advance = () => {
    setError(null);
    if (!canContinue) return;
    if (step < LAST) {
      setStep(step + 1);
      return;
    }
    run(() =>
      completeOnboarding({
        fullName: trimmedName,
        homeCity,
        party,
        tagIds: [...tagIds],
      }),
    );
  };

  const current = STEPS[step];

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container-page flex h-16 shrink-0 items-center justify-between gap-4">
        <Logo />
        <button
          type="button"
          onClick={() => run(skipOnboarding)}
          disabled={pending}
          className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-brand-tint/10 hover:text-brand-700 disabled:opacity-50"
        >
          Lewati
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-2 sm:items-center sm:pb-16">
        <div className="w-full max-w-xl">
          <StepProgress step={step} total={STEPS.length} />

          <div className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {current.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {current.subtitle}
            </p>

            {/* `key` memaksa remount tiap langkah, supaya transisi masuknya
                terputar lagi alih-alih hanya sekali di render pertama. */}
            <div
              key={step}
              className="mt-6 duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
            >
              {step === 0 && (
                <IdentityStep
                  fullName={fullName}
                  onNameChange={setFullName}
                  nameValid={nameValid}
                  homeCity={homeCity}
                  onCityChange={setHomeCity}
                  cities={cities}
                  party={party}
                  onPartyChange={setParty}
                />
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <InterestTiles
                    allTags={allTags}
                    chosen={tagIds}
                    onToggle={toggleTag}
                  />
                  {allTags.length > 0 && (
                    <p className="text-sm text-muted-foreground" role="status">
                      {remaining > 0
                        ? `Pilih ${remaining} tema lagi.`
                        : `${tagIds.size} tema dipilih.`}
                    </p>
                  )}
                </div>
              )}

              {step === 2 && (
                <WelcomeStep
                  name={firstName(trimmedName)}
                  heroSlug={allTags.find((tag) => tagIds.has(tag.id))?.slug}
                />
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((value) => Math.max(0, value - 1));
                }}
                disabled={step === 0 || pending}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:invisible"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Kembali
              </button>

              <button
                type="button"
                onClick={advance}
                disabled={!canContinue || pending}
                className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                {pending
                  ? "Menyimpan..."
                  : step === LAST
                    ? "Mulai jelajahi"
                    : "Lanjut"}
                {!pending && step < LAST && (
                  <ArrowRight className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Sapaan di langkah terakhir memakai nama depan saja. */
function firstName(name: string) {
  return name.split(/\s+/)[0] || "traveler";
}

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step + 1}
      aria-label={`Langkah ${step + 1} dari ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            index <= step ? "bg-brand-700" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function IdentityStep({
  fullName,
  onNameChange,
  nameValid,
  homeCity,
  onCityChange,
  cities,
  party,
  onPartyChange,
}: {
  fullName: string;
  onNameChange: (value: string) => void;
  nameValid: boolean;
  homeCity: string;
  onCityChange: (value: string) => void;
  cities: string[];
  party: string;
  onPartyChange: (value: string) => void;
}) {
  const touched = fullName.length > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="onboarding-name">Nama lengkap</Label>
        <Input
          id="onboarding-name"
          autoComplete="name"
          autoFocus
          maxLength={NAME_MAX}
          placeholder="Budi Santoso"
          value={fullName}
          onChange={(event) => onNameChange(event.target.value)}
          aria-invalid={touched && !nameValid}
          className="h-11"
        />
        {touched && !nameValid && (
          <p className="text-xs text-destructive">
            Nama harus {NAME_MIN}–{NAME_MAX} karakter.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="onboarding-city">
          Kota asal{" "}
          <span className="font-normal text-muted-foreground">(opsional)</span>
        </Label>
        <div className="relative">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="onboarding-city"
            list="onboarding-cities"
            autoComplete="address-level2"
            placeholder="Yogyakarta"
            value={homeCity}
            onChange={(event) => onCityChange(event.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <datalist id="onboarding-cities">
          {cities.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium">
          Biasanya pergi dengan siapa?{" "}
          <span className="font-normal text-muted-foreground">(opsional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_PARTIES.map((option) => {
            const active = party === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onPartyChange(active ? "" : option.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-card hover:border-brand-700 hover:text-brand-700",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
