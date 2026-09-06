"use client";

/**
 * Kartu pilihan yang menempel di bawah balasan AI.
 *
 * Ini satu-satunya jalan saran AI masuk ke rencana. Modelnya sendiri tidak
 * punya izin menulis — tool-nya cuma membaca katalog — jadi kalau ia salah
 * menebak maksud pengguna, yang meleset cuma satu balasan, bukan rencananya.
 * Karena itu tiap opsi di sini butuh satu klik sadar dari pengguna.
 */

import { useState } from "react";
import Image from "next/image";
import { Check, Loader2, MapPin, Plane, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DestinationPreview } from "@/components/planner/destination-preview";
import { Rail } from "@/components/home/rail";
import { Rating } from "@/components/home/rating";
import { coverImage } from "@/lib/home-data";
import { formatIDR } from "@/lib/seeded-random";
import type {
  AccommodationOption,
  DestinationOption,
  InteractiveBlock,
  PlannerFlightOption,
  TripCanvas,
  TripFlightRole,
  TripStop,
} from "@/lib/api";

type Props = {
  blocks: InteractiveBlock[];
  canvas: TripCanvas | null;
  onAddDestination: (id: string) => Promise<void>;
  /** Penginapan menempel ke kota, jadi yang dialamatkan stop — bukan item. */
  onPickAccommodation: (
    stopId: string,
    accommodationId: string,
  ) => Promise<void>;
  onPickFlight: (
    option: PlannerFlightOption,
    stopId: string,
    role: TripFlightRole,
  ) => Promise<void>;
};

/** Semua destinasi di seluruh kota, diratakan jadi satu daftar. */
function allItems(canvas: TripCanvas | null) {
  return (canvas?.stops ?? []).flatMap((stop) => stop.trip_items);
}

const TIER_LABEL: Record<string, string> = {
  budget: "Hemat",
  mid: "Menengah",
  luxury: "Mewah",
};

/** Jam saja — tanggalnya sudah jadi judul kartunya. */
function clock(iso: string) {
  return iso.slice(11, 16);
}

export function InteractiveCards({
  blocks,
  canvas,
  onAddDestination,
  onPickAccommodation,
  onPickFlight,
}: Props) {
  if (blocks.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "destination") {
          return (
            <DestinationCard
              key={i}
              options={block.options}
              canvas={canvas}
              onAdd={onAddDestination}
            />
          );
        }
        if (block.type === "accommodation") {
          return (
            <AccommodationCard
              key={i}
              block={block}
              canvas={canvas}
              onPick={onPickAccommodation}
            />
          );
        }
        return <FlightCard key={i} block={block} canvas={canvas} onPick={onPickFlight} />;
      })}
    </div>
  );
}

function CardShell({
  icon,
  title,
  footnote,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      <div className="divide-y divide-border">{children}</div>
      {footnote ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  name,
  detail,
  action,
}: {
  name: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Added({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-brand-700">
      <Check className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/**
 * Kelompokkan kandidat per daerah, urutan kemunculannya dipertahankan.
 *
 * Satu balasan sering mencakup beberapa daerah sekaligus (Belitung untuk tiga
 * hari pertama, Magelang untuk tiga hari terakhir). Kalau semuanya dituang
 * jadi satu deret, pengguna harus membaca label kota tiap kartu untuk tahu
 * yang mana bagian mana. Dikelompokkan begini, satu deret geser = satu daerah.
 *
 * Kota dipakai sebagai kunci karena itu satuan yang dipikirkan pengguna saat
 * menyusun hari; provinsi jadi cadangan kalau kotanya tidak terisi.
 */
function groupByRegion(options: DestinationOption[]) {
  const groups = new Map<string, DestinationOption[]>();

  for (const option of options) {
    const key = option.city ?? option.province ?? "Lainnya";
    const existing = groups.get(key);
    if (existing) existing.push(option);
    else groups.set(key, [option]);
  }

  return [...groups.entries()];
}

/**
 * Destinasi tampil sebagai deret kartu bergambar yang digeser mendatar, satu
 * deret per daerah.
 *
 * Memilih tempat liburan itu keputusan yang sebagian besar visual — foto,
 * rating, dan satu kalimat tentang tempatnya menjelaskan lebih banyak daripada
 * satu baris teks yang dipadatkan. Digeser mendatar supaya delapan kandidat
 * tidak mendorong sisa percakapan jauh ke bawah layar.
 *
 * Penginapan dan penerbangan tetap berupa baris tanpa gambar: yang
 * dibandingkan di sana angka (harga, jarak, jam), dan angka lebih mudah dibaca
 * kalau berjajar rapi.
 */
function DestinationCard({
  options,
  canvas,
  onAdd,
}: {
  options: DestinationOption[];
  canvas: TripCanvas | null;
  onAdd: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<DestinationOption | null>(null);
  const inTrip = new Set(
    allItems(canvas)
      .map((item) => item.destinations?.id)
      .filter(Boolean),
  );

  const regions = groupByRegion(options);

  const add = async (id: string) => {
    setBusy(id);
    try {
      await onAdd(id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      {regions.map(([region, items]) => (
        <section key={region}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {region}
            <span className="font-normal text-muted-foreground">
              · {items.length} pilihan
            </span>
          </p>

          <Rail label={`Destinasi di ${region}`}>
            {items.map((d) => {
              const added = inTrip.has(d.id);
              return (
                <article
                  key={d.id}
                  className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-brand-700/40 sm:w-48"
                >
                  {/* Seluruh bagian atas kartu jadi satu tombol pembuka
                      pratinjau. Tombol "Tambahkan" sengaja di luar tombol ini
                      -- tombol di dalam tombol tidak sah, dan menambahkan
                      tanpa sengaja saat hanya ingin melihat-lihat itu
                      kesalahan yang menjengkelkan. */}
                  <button
                    type="button"
                    onClick={() => setPreview(d)}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label={`Lihat detail ${d.name}`}
                  >
                    <div
                      data-rail-media
                      className="relative aspect-[4/3] bg-muted"
                    >
                      <Image
                        src={coverImage(
                          {
                            name: d.name,
                            cover_image_url: d.cover_image_url ?? null,
                          },
                          384,
                          288,
                        )}
                        alt=""
                        fill
                        sizes="192px"
                        className="object-cover transition duration-300 hover:scale-105"
                      />
                      {d.category && (
                        <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                          {d.category}
                        </span>
                      )}
                      {added && (
                        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-medium text-white">
                          <Check className="h-3 w-3" />
                          di rencana
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 px-2.5 pt-2.5">
                      <p className="truncate text-sm font-semibold">{d.name}</p>

                      {d.rating ? (
                        <Rating value={d.rating} />
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Belum ada ulasan
                        </p>
                      )}

                      {d.note && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {d.note}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="p-2.5 pt-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-full rounded-full px-2 text-xs"
                      disabled={added || busy !== null}
                      onClick={() => add(d.id)}
                    >
                      {busy === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : added ? (
                        "Sudah ditambahkan"
                      ) : (
                        "Tambahkan"
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </Rail>
        </section>
      ))}

      <DestinationPreview
        destinationId={preview?.id ?? null}
        fallbackName={preview?.name}
        added={preview ? inTrip.has(preview.id) : false}
        onAdd={add}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function AccommodationCard({
  block,
  canvas,
  onPick,
}: {
  block: Extract<InteractiveBlock, { type: "accommodation" }>;
  canvas: TripCanvas | null;
  onPick: (stopId: string, accommodationId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  // Penginapan menempel ke KOTA, bukan ke destinasi: yang dicari adalah stop
  // yang sudah memuat destinasi ini. Kalau destinasinya belum ditambahkan,
  // belum ada kota untuk ditempeli — jadi tombolnya mati dengan penjelasan,
  // bukan pura-pura berhasil lalu gagal diam-diam.
  const target = (canvas?.stops ?? []).find((stop) =>
    stop.trip_items.some((item) => item.destinations?.id === block.destination_id),
  );

  return (
    <CardShell
      icon={<BedDouble className="h-3.5 w-3.5" />}
      title={`Penginapan dekat ${block.near}`}
      footnote={
        target
          ? `Berlaku untuk seluruh destinasi di ${target.cities?.name ?? "kota ini"}.`
          : "Tambahkan destinasinya ke rencana dulu supaya penginapan ini bisa ditempelkan."
      }
    >
      {block.options.map((a: AccommodationOption) => {
        const picked = target?.accommodations?.id === a.id;
        return (
          <Row
            key={a.id}
            name={a.name}
            detail={[
              TIER_LABEL[a.tier] ?? a.tier,
              `${formatIDR(a.price_per_night)}/malam`,
              a.distance_km != null ? `${a.distance_km} km` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            action={
              picked ? (
                <Added label="dipilih" />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={!target || busy !== null}
                  onClick={async () => {
                    if (!target) return;
                    setBusy(a.id);
                    try {
                      await onPick(target.id, a.id);
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === a.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Pilih"
                  )}
                </Button>
              )
            }
          />
        );
      })}
    </CardShell>
  );
}

function FlightCard({
  block,
  canvas,
  onPick,
}: {
  block: Extract<InteractiveBlock, { type: "flight" }>;
  canvas: TripCanvas | null;
  onPick: (
    option: PlannerFlightOption,
    stopId: string,
    role: TripFlightRole,
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const stops = canvas?.stops ?? [];

  // Peran sebuah leg ditentukan kotanya, bukan ditanyakan ke pengguna: rute
  // ini mendarat di `destination_city_id`, jadi bagi kota itu ia penerbangan
  // MASUK; dan ia lepas landas dari `origin_city_id`, jadi bagi kota itu ia
  // penerbangan KELUAR. Kota yang belum jadi stop tidak punya tempat untuk
  // menampung leg-nya, jadi tombolnya tidak ditawarkan.
  const targets: { stop: TripStop; role: TripFlightRole; label: string }[] = [];

  const arrivalStop = stops.find((s) => s.cities?.id === block.destination_city_id);
  if (arrivalStop) {
    targets.push({
      stop: arrivalStop,
      role: "arrival",
      label: `Masuk ${arrivalStop.cities?.name ?? "kota tujuan"}`,
    });
  }

  const departureStop = stops.find((s) => s.cities?.id === block.origin_city_id);
  if (departureStop) {
    targets.push({
      stop: departureStop,
      role: "departure",
      label: `Keluar ${departureStop.cities?.name ?? "kota asal"}`,
    });
  }

  /** Leg yang sudah memakai opsi penerbangan tertentu, kalau ada. */
  const usedBy = (optionId: string) => {
    for (const stop of stops) {
      const leg = stop.trip_flights.find(
        (f) => f.flight_options?.id === optionId,
      );
      if (leg) return { stop, leg };
    }
    return null;
  };

  return (
    <CardShell
      icon={<Plane className="h-3.5 w-3.5" />}
      title={`Penerbangan · ${block.date}`}
      footnote={
        targets.length === 0
          ? "Rute ini belum menyentuh satu pun kota di rencanamu. Tambahkan kotanya dulu lewat destinasi, baru penerbangannya bisa dipasang."
          : "Pilih mau dipasang sebagai penerbangan masuk atau keluar."
      }
    >
      {block.options.map((f) => {
        const used = usedBy(f.id);
        return (
          <Row
            key={f.id}
            name={`${f.airline} ${f.flight_number}`}
            detail={`${clock(f.departure_time)}–${clock(f.arrival_time)} · ${formatIDR(f.price)}`}
            action={
              used ? (
                <Added
                  label={
                    used.leg.flight_role === "arrival"
                      ? `masuk ${used.stop.cities?.name ?? ""}`.trim()
                      : `keluar ${used.stop.cities?.name ?? ""}`.trim()
                  }
                />
              ) : (
                <div className="flex gap-1.5">
                  {targets.map(({ stop, role, label }) => {
                    const key = f.id + role;
                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant="outline"
                        className="rounded-full px-2 text-[11px]"
                        disabled={busy !== null}
                        onClick={async () => {
                          setBusy(key);
                          try {
                            await onPick(f, stop.id, role);
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        {busy === key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          label
                        )}
                      </Button>
                    );
                  })}
                </div>
              )
            }
          />
        );
      })}
    </CardShell>
  );
}
