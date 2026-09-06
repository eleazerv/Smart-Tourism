"use client";

/**
 * Pratinjau destinasi, muncul saat kartu di percakapan ditekan.
 *
 * Kartu di chat hanya memuat satu kalimat — cukup untuk menyaring, belum cukup
 * untuk memutuskan. Dialog ini membawa yang sisanya: deskripsi penuh, foto dari
 * ulasan orang, dan ulasannya sendiri. Tombol tambah ikut dibawa ke sini
 * supaya keputusannya bisa diambil di tempat yang sama dengan alasannya,
 * tanpa menutup dulu lalu mencari kartunya lagi.
 *
 * Dibangun di atas elemen `<dialog>` bawaan seperti ConfirmDialog: focus trap,
 * Esc, dan backdrop-nya sudah gratis dari browser.
 */

import { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  Camera,
  Check,
  Eye,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/home/rating";
import { Avatar } from "@/components/account/avatar";
import { coverImage } from "@/lib/home-data";
import { MONTHS, MONTHS_SHORT, relativeDate } from "@/lib/destination-data";
import { cn } from "@/lib/utils";
import {
  getDestination,
  getReviews,
  type DestinationDetail,
  type Review,
} from "@/lib/api";

type SeasonWindow = { months: number[]; seasons: string[] };

/**
 * Bulan terbaik datang dari route handler sendiri, bukan langsung dari API
 * Express: jawabannya perlu dirakit dari dua belas panggilan, dan itu jauh
 * lebih murah dikerjakan sekali di server lalu di-cache.
 */
async function loadSeason(
  destination: DestinationDetail,
): Promise<SeasonWindow> {
  const params = new URLSearchParams({ destination_id: destination.id });
  if (destination.province_id) {
    params.set("province_id", String(destination.province_id));
  }

  try {
    const res = await fetch(`/api/destination-season?${params}`);
    if (!res.ok) return { months: [], seasons: [] };
    return (await res.json()) as SeasonWindow;
  } catch {
    return { months: [], seasons: [] };
  }
}

type Props = {
  /** Destinasi yang sedang dibuka; null berarti dialog tertutup. */
  destinationId: string | null;
  /** Nama dari kartu, dipakai sebagai judul sementara selagi detail dimuat. */
  fallbackName?: string;
  /** Sudah ada di rencana — tombol tambahnya dinonaktifkan. */
  added: boolean;
  onAdd: (id: string) => Promise<void>;
  onClose: () => void;
};

export function DestinationPreview({
  destinationId,
  fallbackName,
  added,
  onAdd,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<DestinationDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [season, setSeason] = useState<SeasonWindow | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const titleId = useId();

  const dialogRef = useCallback(
    (node: HTMLDialogElement | null) => {
      if (!node) return;
      if (destinationId && !node.open) node.showModal();
      if (!destinationId && node.open) node.close();
    },
    [destinationId],
  );

  useEffect(() => {
    if (!destinationId) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setDetail(null);
    setReviews([]);
    setSeason(null);

    // Ulasan diambil bersamaan, bukan setelah detail selesai: keduanya tidak
    // saling bergantung, dan dialog yang menunggu dua kali terasa berat.
    Promise.all([
      getDestination(destinationId),
      getReviews(destinationId).catch(() => [] as Review[]),
    ])
      .then(([destination, list]) => {
        if (cancelled) return;
        if (!destination) setFailed(true);
        setDetail(destination);
        setReviews(list);

        // Menyusul terpisah: bulan terbaik dirakit dari dua belas panggilan di
        // sisi server, jadi jauh lebih lambat daripada dua di atas. Menunggu
        // ketiganya berarti menahan seluruh dialog demi satu blok kecil.
        if (!destination) return;
        loadSeason(destination).then((result) => {
          if (!cancelled) setSeason(result);
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [destinationId]);

  if (!destinationId) return null;

  const name = detail?.name ?? fallbackName ?? "Destinasi";
  const place = [detail?.cities?.name, detail?.provinces?.name]
    .filter(Boolean)
    .join(", ");
  const photos = reviews.filter((r) => r.photo_url);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Backdrop adalah bagian dari elemen dialog itu sendiri, jadi klik
        // yang mendarat di elemennya (bukan isinya) datang dari luar kartu.
        if (e.target === e.currentTarget) onClose();
      }}
      className="pointer-events-auto fixed left-1/2 top-1/2 m-0 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-pop duration-150 animate-in fade-in-0 backdrop:bg-foreground/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="relative aspect-[16/9] bg-muted">
        <Image
          src={coverImage(
            { name, cover_image_url: detail?.cover_image_url ?? null },
            800,
            450,
          )}
          alt=""
          fill
          sizes="512px"
          className="object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/85 backdrop-blur-sm transition hover:bg-background"
        >
          <X className="h-4 w-4" />
        </button>
        {detail?.category && (
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            {detail.category}
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <header className="space-y-1.5">
          <h2 id={titleId} className="font-display text-lg font-bold tracking-tight">
            {name}
          </h2>
          {place && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {place}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {detail?.avg_rating ? (
              <Rating value={detail.avg_rating} reviews={reviews.length} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Belum ada ulasan
              </span>
            )}
            {detail?.view_count ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                {detail.view_count.toLocaleString("id-ID")} kali dilihat
              </span>
            ) : null}
          </div>
        </header>

        {loading && (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat detail destinasi…
          </p>
        )}

        {failed && !loading && (
          <p className="rounded-xl border border-border px-4 py-5 text-sm text-muted-foreground">
            Detail destinasi ini belum bisa dimuat. Coba lagi sebentar lagi.
          </p>
        )}

        {detail?.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {detail.description}
          </p>
        )}

        {detail?.tags && detail.tags.length > 0 && (
          <section>
            <SectionTitle icon={<TagIcon className="h-3.5 w-3.5" />}>
              Cocok untuk
            </SectionTitle>
            <ul className="flex flex-wrap gap-1.5">
              {detail.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full bg-brand-tint/10 px-2.5 py-1 text-[11px] font-medium text-brand-700"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {season && season.months.length > 0 && (
          <BestMonths months={season.months} seasons={season.seasons} />
        )}

        {photos.length > 0 && (
          <section>
            <SectionTitle icon={<Camera className="h-3.5 w-3.5" />}>
              Foto dari pengunjung
            </SectionTitle>
            {/* Digeser mendatar supaya galeri sepanjang apa pun tidak mendorong
                ulasannya keluar dari layar. */}
            <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {photos.map((review) => (
                <li key={review.id} className="shrink-0">
                  <div className="relative h-24 w-32 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={review.photo_url as string}
                      alt={`Foto ulasan ${name}`}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>
            Ulasan
          </SectionTitle>
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              Belum ada ulasan untuk tempat ini.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.slice(0, REVIEWS_SHOWN).map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </ul>
          )}
          {reviews.length > REVIEWS_SHOWN && (
            <Link
              href={`/destinations/${destinationId}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Lihat {reviews.length - REVIEWS_SHOWN} ulasan lainnya
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur-sm">
        <Button variant="outline" className="shrink-0 rounded-full" asChild>
          <Link href={`/destinations/${destinationId}`}>Halaman lengkap</Link>
        </Button>
        <Button
          className="flex-1 rounded-full"
          disabled={added || adding}
          onClick={async () => {
            setAdding(true);
            try {
              await onAdd(destinationId);
              onClose();
            } finally {
              setAdding(false);
            }
          }}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : added ? (
            <>
              <Check className="h-4 w-4" />
              Sudah di rencana
            </>
          ) : (
            "Tambahkan ke rencana"
          )}
        </Button>
      </div>
    </dialog>
  );
}

/** Sisanya dibaca di halaman destinasi — dialog ini untuk menimbang, bukan menelusuri. */
const REVIEWS_SHOWN = 4;

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children}
    </h3>
  );
}

/**
 * Dua belas kotak bulan, yang cocok disorot.
 *
 * Versi ringkas dari `components/destination/best-time.tsx` — bentuk dan warna
 * sengaja dibuat sama supaya pengguna yang sudah pernah melihatnya di halaman
 * destinasi langsung mengenali maksudnya, tapi tanpa heading besar dan anchor
 * yang cuma masuk akal di halaman penuh.
 */
function BestMonths({
  months,
  seasons,
}: {
  months: number[];
  seasons: string[];
}) {
  const currentMonth = new Date().getMonth() + 1;
  const good = new Set(months);

  return (
    <section>
      <SectionTitle icon={<CalendarRange className="h-3.5 w-3.5" />}>
        Waktu terbaik berkunjung
      </SectionTitle>

      <ul className="grid grid-cols-6 gap-1 sm:grid-cols-12">
        {MONTHS_SHORT.map((short, i) => {
          const month = i + 1;
          return (
            <li key={short}>
              <div
                title={MONTHS[i]}
                aria-label={`${MONTHS[i]}: ${good.has(month) ? "direkomendasikan" : "kurang direkomendasikan"}`}
                className={cn(
                  "rounded-lg border py-1.5 text-center text-[10px] font-semibold",
                  good.has(month)
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-border bg-card text-muted-foreground",
                  month === currentMonth &&
                    "ring-2 ring-brand-tint ring-offset-1 ring-offset-background",
                )}
              >
                {short}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Bulan yang disorot cocok dengan aktivitas di sini
        {seasons.length > 0 && <> selama musim {seasons.join(" dan ")}</>}.
        Bulan berjalan ({MONTHS[currentMonth - 1]}) ditandai lingkaran.
      </p>
    </section>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const author = review.users?.full_name ?? "Pengguna";

  return (
    <li className="flex gap-2.5">
      <Avatar
        name={author}
        src={review.users?.avatar_url}
        pixels={32}
        className="h-8 w-8 text-[11px]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-xs font-medium">{author}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeDate(review.created_at)}
          </span>
        </div>
        <Rating value={review.rating} className="mt-0.5" />
        {review.comment && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {review.comment}
          </p>
        )}
        {review.like_count > 0 && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Heart className="h-3 w-3" />
            {review.like_count}
          </p>
        )}
      </div>
    </li>
  );
}
