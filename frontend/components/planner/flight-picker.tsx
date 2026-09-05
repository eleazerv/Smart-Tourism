"use client";

/**
 * Pemilih penerbangan di panel rencana — satu per kota.
 *
 * Sebelumnya penerbangan cuma bisa diisi lewat percakapan, dan itu buntu kalau
 * AI tidak mengerjakannya.
 *
 * Sejak rencana disusun per kota, rutenya tidak perlu ditebak-tebak lagi:
 * penerbangan `arrival` membawa masuk ke kota stop ini, jadi tujuannya pasti
 * kota ini dan asalnya kota stop sebelumnya (atau kota asal trip untuk stop
 * pertama). `departure` kebalikannya — dari kota ini menuju kota stop
 * berikutnya, atau pulang ke kota asal untuk stop terakhir. Tanggalnya ikut
 * check-in untuk yang masuk dan check-out untuk yang keluar.
 *
 * Tebakan itu tetap ditampilkan sebagai kolom yang bisa diubah, bukan
 * diam-diam dipakai: rute yang salah jadi terlihat sebelum dicari, bukan
 * sesudah hasilnya aneh.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Plane, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/seeded-random";
import { cn } from "@/lib/utils";
import {
  listCities,
  searchFlights,
  type City,
  type FlightOption,
  type TripCanvas,
  type TripFlightRole,
  type TripStop,
} from "@/lib/api";

const ROLE_LABEL: Record<TripFlightRole, string> = {
  arrival: "Masuk",
  departure: "Keluar",
};

export function FlightPicker({
  canvas,
  stop,
  disabled,
  onPick,
}: {
  canvas: TripCanvas;
  stop: TripStop;
  disabled: boolean;
  onPick: (option: FlightOption, role: TripFlightRole) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[] | null>(null);

  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [role, setRole] = useState<TripFlightRole>("arrival");

  const [results, setResults] = useState<FlightOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Rute dan tanggal yang paling masuk akal untuk peran yang sedang dipilih. */
  const guess = useMemo(() => {
    const stops = canvas.stops ?? [];
    const index = stops.findIndex((s) => s.id === stop.id);
    const previous = index > 0 ? stops[index - 1] : undefined;
    const next = index >= 0 ? stops[index + 1] : undefined;
    const homeCityId = canvas.trip?.origin_city_id ?? null;

    if (role === "arrival") {
      return {
        origin: previous?.cities?.id ?? homeCityId,
        destination: stop.cities?.id ?? null,
        date: stop.check_in ?? canvas.trip?.start_date ?? "",
      };
    }

    return {
      origin: stop.cities?.id ?? null,
      destination: next?.cities?.id ?? homeCityId,
      date: stop.check_out ?? canvas.trip?.end_date ?? "",
    };
  }, [canvas, stop, role]);

  // Tebakan dipasang ulang saat panelnya dibuka dan saat perannya ditukar --
  // dua momen ketika rute yang benar memang berubah. Dibaca lewat ref supaya
  // canvas yang diperbarui di tengah pengisian tidak menimpa ketikan orang.
  const guessRef = useRef(guess);
  guessRef.current = guess;

  useEffect(() => {
    if (!open) return;
    const seed = guessRef.current;
    setOrigin(seed.origin ? String(seed.origin) : "");
    setDestination(seed.destination ? String(seed.destination) : "");
    setDate(seed.date ?? "");
    setResults(null);
    setError(null);
  }, [open, role]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || cities) return;

    try {
      setCities(await listCities());
    } catch {
      setCities([]);
      setError("Daftar kota belum bisa dimuat.");
    }
  }

  async function run() {
    setError(null);
    setResults(null);

    if (!origin || !destination || !date) {
      setError("Kota asal, kota tujuan, dan tanggal wajib diisi.");
      return;
    }
    if (origin === destination) {
      setError("Kota asal dan tujuan tidak boleh sama.");
      return;
    }

    setSearching(true);
    try {
      setResults(
        await searchFlights({
          origin_city_id: Number(origin),
          destination_city_id: Number(destination),
          date,
        }),
      );
    } catch {
      setError("Pencarian gagal. Coba lagi sebentar lagi.");
    } finally {
      setSearching(false);
    }
  }

  // Tiap kota cuma punya satu leg masuk dan satu leg keluar, jadi mengisi
  // peran yang sudah terpakai berarti mengganti, bukan menambah.
  const occupied = stop.trip_flights.find((f) => f.flight_role === role);

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
        <Plane className="h-3.5 w-3.5" />
        Cari penerbangan
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="mt-1.5 space-y-2 rounded-xl border border-border p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <CitySelect
              label="Dari"
              value={origin}
              cities={cities}
              disabled={disabled}
              onChange={setOrigin}
            />
            <CitySelect
              label="Ke"
              value={destination}
              cities={cities}
              disabled={disabled}
              onChange={setDestination}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="sr-only">Tanggal berangkat</span>
              <input
                type="date"
                title="Tanggal berangkat"
                value={date}
                disabled={disabled}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="sr-only">Peran penerbangan</span>
              <select
                title="Peran penerbangan"
                value={role}
                disabled={disabled}
                onChange={(e) => setRole(e.target.value as TripFlightRole)}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
              >
                <option value="arrival">Masuk ke kota ini</option>
                <option value="departure">Keluar dari kota ini</option>
              </select>
            </label>
          </div>

          <Button
            size="sm"
            className="h-7 w-full rounded-full text-xs"
            disabled={disabled || searching}
            onClick={run}
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            Cari
          </Button>

          {occupied && !occupied.booked_at && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Leg {ROLE_LABEL[role].toLowerCase()} sedang diisi{" "}
              {occupied.flight_options?.airline}{" "}
              {occupied.flight_options?.flight_number}. Memilih di sini akan
              menggantinya.
            </p>
          )}

          {occupied?.booked_at && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Leg {ROLE_LABEL[role].toLowerCase()} sudah dipesan dan tidak bisa
              ditimpa. Batalkan pesanannya dulu di halaman Pesanan.
            </p>
          )}

          {error && (
            <p className="text-[11px] leading-relaxed text-destructive">
              {error}
            </p>
          )}

          {results?.length === 0 && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Tidak ada penerbangan di rute itu pada tanggal tersebut. Coba
              tanggal lain.
            </p>
          )}

          {results && results.length > 0 && (
            <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {results.map((flight) => (
                <li key={flight.id}>
                  <button
                    type="button"
                    disabled={disabled || picking !== null}
                    onClick={async () => {
                      setPicking(flight.id);
                      try {
                        await onPick(flight, role);
                        setResults(null);
                        setOpen(false);
                      } finally {
                        setPicking(null);
                      }
                    }}
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {flight.airline} {flight.flight_number}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {flight.departure_time.slice(11, 16)}–
                        {flight.arrival_time.slice(11, 16)} ·{" "}
                        {flight.available_seats} kursi
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold">
                      {picking === flight.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        formatIDR(flight.price)
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CitySelect({
  label,
  value,
  cities,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  cities: City[] | null;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        title={label}
        value={value}
        disabled={disabled || cities === null}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50"
      >
        <option value="">{cities === null ? "Memuat…" : `${label} kota`}</option>
        {cities?.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </label>
  );
}
