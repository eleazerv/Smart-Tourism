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
import { Check, Loader2, MapPin, Plane, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/seeded-random";
import type {
  AccommodationOption,
  DestinationOption,
  InteractiveBlock,
  PlannerFlightOption,
  TripCanvas,
} from "@/lib/api";

type Props = {
  blocks: InteractiveBlock[];
  canvas: TripCanvas | null;
  onAddDestination: (id: string) => Promise<void>;
  onPickAccommodation: (itemId: string, accommodationId: string) => Promise<void>;
  onPickFlight: (
    option: PlannerFlightOption,
    type: "outbound" | "return",
  ) => Promise<void>;
};

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
    <span className="flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-100">
      <Check className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

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
  const inTrip = new Set(
    (canvas?.items ?? []).map((item) => item.destinations?.id).filter(Boolean),
  );

  return (
    <CardShell icon={<MapPin className="h-3.5 w-3.5" />} title="Destinasi">
      {options.map((d) => (
        <Row
          key={d.id}
          name={d.name}
          detail={[d.city, d.category, d.rating ? `★ ${d.rating}` : null]
            .filter(Boolean)
            .join(" · ")}
          action={
            inTrip.has(d.id) ? (
              <Added label="di rencana" />
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(d.id);
                  try {
                    await onAdd(d.id);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === d.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Tambahkan"
                )}
              </Button>
            )
          }
        />
      ))}
    </CardShell>
  );
}

function AccommodationCard({
  block,
  canvas,
  onPick,
}: {
  block: Extract<InteractiveBlock, { type: "accommodation" }>;
  canvas: TripCanvas | null;
  onPick: (itemId: string, accommodationId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  // Penginapan selalu menempel ke satu destinasi di rencana. Kalau destinasinya
  // belum ditambahkan, belum ada baris untuk ditempeli — jadi tombolnya mati
  // dengan penjelasan, bukan pura-pura berhasil lalu gagal diam-diam.
  const target = (canvas?.items ?? []).find(
    (item) => item.destinations?.id === block.destination_id,
  );

  return (
    <CardShell
      icon={<BedDouble className="h-3.5 w-3.5" />}
      title={`Penginapan dekat ${block.near}`}
      footnote={
        target
          ? null
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
    type: "outbound" | "return",
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const flights = canvas?.flights ?? [];
  const bothFilled =
    flights.some((f) => f.flight_type === "outbound") &&
    flights.some((f) => f.flight_type === "return");

  return (
    <CardShell
      icon={<Plane className="h-3.5 w-3.5" />}
      title={`Penerbangan · ${block.date}`}
      footnote={
        bothFilled
          ? "Slot berangkat dan pulang sudah terisi — memilih di sini akan mengganti salah satunya."
          : "Pilih sebagai penerbangan berangkat atau pulang."
      }
    >
      {block.options.map((f) => {
        const used = flights.find((x) => x.flight_options?.id === f.id);
        return (
          <Row
            key={f.id}
            name={`${f.airline} ${f.flight_number}`}
            detail={`${clock(f.departure_time)}–${clock(f.arrival_time)} · ${formatIDR(f.price)}`}
            action={
              used ? (
                <Added
                  label={used.flight_type === "outbound" ? "berangkat" : "pulang"}
                />
              ) : (
                <div className="flex gap-1.5">
                  {(["outbound", "return"] as const).map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant="outline"
                      className="px-2 text-[11px]"
                      disabled={busy !== null}
                      onClick={async () => {
                        setBusy(f.id + type);
                        try {
                          await onPick(f, type);
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === f.id + type ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : type === "outbound" ? (
                        "Berangkat"
                      ) : (
                        "Pulang"
                      )}
                    </Button>
                  ))}
                </div>
              )
            }
          />
        );
      })}
    </CardShell>
  );
}
